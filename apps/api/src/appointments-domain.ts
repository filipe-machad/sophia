import { z } from "zod";

export const appointmentStatuses = ["scheduled", "completed", "cancelled", "no_show"] as const;
export const paymentStatuses = ["pending", "paid", "waived"] as const;

export const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  startsAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(50),
  mode: z.enum(["online", "in_person"]),
});

export const updateAppointmentSchema = z.object({
  clientId: z.string().uuid().optional(),
  startsAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  mode: z.enum(["online", "in_person"]).optional(),
}).refine(value => Object.values(value).some(item => item !== undefined), {
  message: "At least one field is required",
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(appointmentStatuses),
  absenceJustified: z.boolean().optional(),
  charge: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.status === "no_show" && value.absenceJustified === undefined) {
    context.addIssue({
      code: "custom",
      message: "absenceJustified is required for no_show",
      path: ["absenceJustified"],
    });
  }
});

export const updatePaymentSchema = z.object({
  status: z.enum(["pending", "paid"]),
});

export function currentMonthInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  if (!year || !month) throw new Error("Unable to determine current month");
  return year + "-" + month;
}

export function monthBoundsInSaoPaulo(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [yearPart, monthPart] = month.split("-");
  if (!yearPart || !monthPart) return null;
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    from: new Date(month + "-01T00:00:00-03:00"),
    to: new Date(String(nextYear).padStart(4, "0") + "-" + String(nextMonth).padStart(2, "0") + "-01T00:00:00-03:00"),
  };
}

export function paymentStatusAfterCharge(
  currentStatus: typeof paymentStatuses[number],
  charge: boolean | undefined,
) {
  if (charge === undefined) return { status: currentStatus } as const;
  if (!charge && currentStatus === "paid") return { error: "paid_payment_cannot_be_waived" } as const;
  if (!charge) return { status: "waived" } as const;
  return { status: currentStatus === "waived" ? "pending" : currentStatus } as const;
}
