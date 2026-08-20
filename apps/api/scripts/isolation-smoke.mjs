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

console.log("isolation-smoke=passed");
