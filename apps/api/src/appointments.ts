import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client.js";
import { appointments, clients, payments } from "./db/schema.js";
import { requireAuth } from "./auth.js";
import {
  createAppointmentSchema,
  currentMonthInSaoPaulo,
  monthBoundsInSaoPaulo,
  paymentStatusAfterCharge,
  paymentStatuses,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  updatePaymentSchema,
} from "./appointments-domain.js";

const appointmentParamsSchema = z.object({ id: z.string().uuid() });
const appointmentListQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  app.get("/appointments", { preHandler: requireAuth }, async (request, reply) => {
    const query = appointmentListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });

    const month = query.data.month ?? currentMonthInSaoPaulo();
    const bounds = monthBoundsInSaoPaulo(month);
    if (!bounds) return reply.code(400).send({ error: "invalid_month" });

    const rows = await db
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        clientName: clients.name,
        startsAt: appointments.startsAt,
        durationMinutes: appointments.durationMinutes,
        mode: appointments.mode,
        status: appointments.status,
        absenceJustified: appointments.absenceJustified,
        paymentStatus: payments.status,
        amount: payments.amount,
        paidAt: payments.paidAt,
      })
      .from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .innerJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(and(
        eq(appointments.ownerId, request.authUser.id),
        gte(appointments.startsAt, bounds.from),
        lt(appointments.startsAt, bounds.to),
      ))
      .orderBy(asc(appointments.startsAt));

    return { month, appointments: rows };
  });

  app.post("/appointments", { preHandler: requireAuth }, async (request, reply) => {
    const input = createAppointmentSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "invalid_input" });

    const result = await db.transaction(async (transaction) => {
      const [client] = await transaction
        .select({ id: clients.id, name: clients.name, sessionPrice: clients.sessionPrice })
        .from(clients)
        .where(and(
          eq(clients.id, input.data.clientId),
          eq(clients.ownerId, request.authUser.id),
          eq(clients.active, true),
        ))
        .limit(1);
      if (!client) return null;

      const [appointment] = await transaction
        .insert(appointments)
        .values({
          ownerId: request.authUser.id,
          clientId: client.id,
          startsAt: input.data.startsAt,
          durationMinutes: input.data.durationMinutes,
          mode: input.data.mode,
        })
        .returning();
      if (!appointment) throw new Error("Appointment creation failed");

      const [payment] = await transaction
        .insert(payments)
        .values({
          ownerId: request.authUser.id,
          appointmentId: appointment.id,
          amount: client.sessionPrice,
          status: "pending",
        })
        .returning();
      if (!payment) throw new Error("Payment creation failed");

      return {
        ...appointment,
        clientName: client.name,
        paymentStatus: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
      };
    });

    if (!result) return reply.code(404).send({ error: "client_not_found" });
    return reply.code(201).send({ appointment: result });
  });

  app.patch("/appointments/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = appointmentParamsSchema.safeParse(request.params);
    const input = updateAppointmentSchema.safeParse(request.body);
    if (!params.success || !input.success) return reply.code(400).send({ error: "invalid_input" });

    const result = await db.transaction(async (transaction) => {
      const [record] = await transaction
        .select({ id: appointments.id, clientId: appointments.clientId })
        .from(appointments)
        .where(and(
          eq(appointments.id, params.data.id),
          eq(appointments.ownerId, request.authUser.id),
        ))
        .limit(1);
      if (!record) return { error: "appointment_not_found" } as const;

      const targetClientId = input.data.clientId ?? record.clientId;
      const [targetClient] = await transaction
        .select({ id: clients.id, name: clients.name, active: clients.active })
        .from(clients)
        .where(and(
          eq(clients.id, targetClientId),
          eq(clients.ownerId, request.authUser.id),
        ))
        .limit(1);
      if (!targetClient || (targetClient.id !== record.clientId && !targetClient.active)) {
        return { error: "client_not_found" } as const;
      }

      const updates: Partial<typeof appointments.$inferInsert> = { updatedAt: new Date() };
      if (input.data.clientId !== undefined) updates.clientId = input.data.clientId;
      if (input.data.startsAt !== undefined) updates.startsAt = input.data.startsAt;
      if (input.data.durationMinutes !== undefined) updates.durationMinutes = input.data.durationMinutes;
      if (input.data.mode !== undefined) updates.mode = input.data.mode;

      const [appointment] = await transaction
        .update(appointments)
        .set(updates)
        .where(and(
          eq(appointments.id, record.id),
          eq(appointments.ownerId, request.authUser.id),
        ))
        .returning();
      if (!appointment) throw new Error("Appointment update failed");

      const [payment] = await transaction
        .select({ status: payments.status, amount: payments.amount, paidAt: payments.paidAt })
        .from(payments)
        .where(and(
          eq(payments.appointmentId, appointment.id),
          eq(payments.ownerId, request.authUser.id),
        ))
        .limit(1);
      if (!payment) throw new Error("Appointment payment not found");

      return {
        appointment: {
          ...appointment,
          clientName: targetClient.name,
          paymentStatus: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
        },
      } as const;
    });

    if ("error" in result) return reply.code(404).send({ error: result.error });
    return result;
  });

  app.patch("/appointments/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const params = appointmentParamsSchema.safeParse(request.params);
    const input = updateAppointmentStatusSchema.safeParse(request.body);
    if (!params.success || !input.success) return reply.code(400).send({ error: "invalid_input" });

    const [record] = await db
      .select({
        appointmentId: appointments.id,
        paymentId: payments.id,
        paymentStatus: payments.status,
      })
      .from(appointments)
      .innerJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(and(
        eq(appointments.id, params.data.id),
        eq(appointments.ownerId, request.authUser.id),
      ))
      .limit(1);
    if (!record) return reply.code(404).send({ error: "appointment_not_found" });

    const paymentTransition = paymentStatusAfterCharge(
      record.paymentStatus as typeof paymentStatuses[number],
      input.data.charge,
    );
    if ("error" in paymentTransition) return reply.code(409).send({ error: paymentTransition.error });

    await db.transaction(async (transaction) => {
      await transaction
        .update(appointments)
        .set({
          status: input.data.status,
          absenceJustified: input.data.status === "no_show" ? input.data.absenceJustified : null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(appointments.id, record.appointmentId),
          eq(appointments.ownerId, request.authUser.id),
        ));

      if (paymentTransition.status !== record.paymentStatus) {
        await transaction
          .update(payments)
          .set({
            status: paymentTransition.status,
            paidAt: paymentTransition.status === "paid" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(payments.id, record.paymentId),
            eq(payments.ownerId, request.authUser.id),
          ));
      }
    });

    return {
      appointment: {
        id: record.appointmentId,
        status: input.data.status,
        absenceJustified: input.data.status === "no_show" ? input.data.absenceJustified : null,
        paymentStatus: paymentTransition.status,
      },
    };
  });

  app.patch("/appointments/:id/payment", { preHandler: requireAuth }, async (request, reply) => {
    const params = appointmentParamsSchema.safeParse(request.params);
    const input = updatePaymentSchema.safeParse(request.body);
    if (!params.success || !input.success) return reply.code(400).send({ error: "invalid_input" });

    const [payment] = await db
      .select({ id: payments.id })
      .from(payments)
      .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
      .where(and(
        eq(appointments.id, params.data.id),
        eq(appointments.ownerId, request.authUser.id),
        eq(payments.ownerId, request.authUser.id),
      ))
      .limit(1);
    if (!payment) return reply.code(404).send({ error: "appointment_not_found" });

    const [updated] = await db
      .update(payments)
      .set({
        status: input.data.status,
        paidAt: input.data.status === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, payment.id), eq(payments.ownerId, request.authUser.id)))
      .returning({
        status: payments.status,
        paidAt: payments.paidAt,
        amount: payments.amount,
      });

    return { payment: updated };
  });
}
