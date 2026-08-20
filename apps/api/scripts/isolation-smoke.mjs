import assert from "node:assert/strict";

const api = "http://localhost:3333";
const origin = "http://localhost:3000";
const run = Date.now();

async function register(label) {
  const response = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ professionalName: `Teste ${label}`, email: `isolation-${label}-${run}@entrelaco.local`, password: "Test-only-Strong-Password-42" }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie);
  return cookie;
}

const ownerCookie = await register("owner");
const otherCookie = await register("other");

const created = await fetch(`${api}/clients`, {
  method: "POST",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ name: "Cliente Isolado", sessionPrice: 190, sessionsPerMonth: 4 }),
});
assert.equal(created.status, 201);
const { client } = await created.json();

const forbiddenUpdate = await fetch(`${api}/clients/${client.id}`, {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: otherCookie },
  body: JSON.stringify({ name: "Tentativa indevida" }),
});
assert.equal(forbiddenUpdate.status, 404);

const otherList = await fetch(`${api}/clients`, { headers: { cookie: otherCookie } });
assert.equal(otherList.status, 200);
assert.deepEqual((await otherList.json()).clients, []);

const ownerArchive = await fetch(`${api}/clients/${client.id}`, { method: "DELETE", headers: { origin, cookie: ownerCookie } });
assert.equal(ownerArchive.status, 204);

const ownerArchivedList = await fetch(`${api}/clients?status=archived`, { headers: { cookie: ownerCookie } });
assert.equal(ownerArchivedList.status, 200);
assert.deepEqual((await ownerArchivedList.json()).clients.map(item => item.id), [client.id]);

const otherArchivedList = await fetch(`${api}/clients?status=archived`, { headers: { cookie: otherCookie } });
assert.equal(otherArchivedList.status, 200);
assert.deepEqual((await otherArchivedList.json()).clients, []);

const forbiddenRestore = await fetch(`${api}/clients/${client.id}/restore`, { method: "POST", headers: { origin, cookie: otherCookie } });
assert.equal(forbiddenRestore.status, 404);

const ownerRestore = await fetch(`${api}/clients/${client.id}/restore`, { method: "POST", headers: { origin, cookie: ownerCookie } });
assert.equal(ownerRestore.status, 200);
assert.equal((await ownerRestore.json()).client.active, true);

const monthParts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
const testYear = monthParts.find(part => part.type === "year")?.value;
const testMonthNumber = monthParts.find(part => part.type === "month")?.value;
assert.ok(testYear && testMonthNumber);
const testMonth = testYear + "-" + testMonthNumber;
const startsAt = testMonth + "-15T10:00:00-03:00";

const createdAppointment = await fetch(api + "/appointments", {
  method: "POST",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ clientId: client.id, startsAt, durationMinutes: 50, mode: "online" }),
});
assert.equal(createdAppointment.status, 201);
const { appointment } = await createdAppointment.json();
assert.equal(appointment.amount, "190.00");

const changedPrice = await fetch(api + "/clients/" + client.id, {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ sessionPrice: 250 }),
});
assert.equal(changedPrice.status, 200);

const ownerAppointments = await fetch(api + "/appointments?month=" + testMonth, { headers: { cookie: ownerCookie } });
assert.equal(ownerAppointments.status, 200);
const ownerAppointmentRows = (await ownerAppointments.json()).appointments;
assert.deepEqual(ownerAppointmentRows.map(item => item.id), [appointment.id]);
assert.equal(ownerAppointmentRows[0].amount, "190.00");

const otherAppointments = await fetch(api + "/appointments?month=" + testMonth, { headers: { cookie: otherCookie } });
assert.equal(otherAppointments.status, 200);
assert.deepEqual((await otherAppointments.json()).appointments, []);

const forbiddenPayment = await fetch(api + "/appointments/" + appointment.id + "/payment", {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: otherCookie },
  body: JSON.stringify({ status: "paid" }),
});
assert.equal(forbiddenPayment.status, 404);

const paid = await fetch(api + "/appointments/" + appointment.id + "/payment", {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ status: "paid" }),
});
assert.equal(paid.status, 200);
assert.equal((await paid.json()).payment.status, "paid");

const invalidNoShow = await fetch(api + "/appointments/" + appointment.id + "/status", {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ status: "no_show" }),
});
assert.equal(invalidNoShow.status, 400);

const waivePaid = await fetch(api + "/appointments/" + appointment.id + "/status", {
  method: "PATCH",
  headers: { "content-type": "application/json", origin, cookie: ownerCookie },
  body: JSON.stringify({ status: "no_show", absenceJustified: true, charge: false }),
});
assert.equal(waivePaid.status, 409);

console.log("isolation-smoke=passed");
