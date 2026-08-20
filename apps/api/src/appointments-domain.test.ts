import { describe, expect, it } from "vitest";
import {
  currentMonthInSaoPaulo,
  monthBoundsInSaoPaulo,
  paymentStatusAfterCharge,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments-domain.js";

describe("appointment domain", () => {
  it("creates São Paulo month boundaries", () => {
    const bounds = monthBoundsInSaoPaulo("2026-08");
    expect(bounds?.from.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(bounds?.to.toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });

  it("handles the December boundary", () => {
    expect(monthBoundsInSaoPaulo("2026-12")?.to.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("rejects invalid months", () => {
    expect(monthBoundsInSaoPaulo("2026-13")).toBeNull();
  });

  it("calculates the current month in São Paulo", () => {
    expect(currentMonthInSaoPaulo(new Date("2026-09-01T02:30:00.000Z"))).toBe("2026-08");
  });

  it("validates partial appointment updates", () => {
    expect(updateAppointmentSchema.safeParse({}).success).toBe(false);
    expect(updateAppointmentSchema.safeParse({ durationMinutes: 60 }).success).toBe(true);
    expect(updateAppointmentSchema.safeParse({ durationMinutes: 5 }).success).toBe(false);
    expect(updateAppointmentSchema.safeParse({ mode: "telephone" }).success).toBe(false);
  });

  it("requires justification information for a no-show", () => {
    expect(updateAppointmentStatusSchema.safeParse({ status: "no_show" }).success).toBe(false);
    expect(updateAppointmentStatusSchema.safeParse({ status: "no_show", absenceJustified: false }).success).toBe(true);
  });

  it("does not waive a payment already marked as paid", () => {
    expect(paymentStatusAfterCharge("paid", false)).toEqual({ error: "paid_payment_cannot_be_waived" });
    expect(paymentStatusAfterCharge("pending", false)).toEqual({ status: "waived" });
    expect(paymentStatusAfterCharge("waived", true)).toEqual({ status: "pending" });
  });
});
