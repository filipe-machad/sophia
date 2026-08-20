import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalName: varchar("professional_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("auth_sessions_token_unique").on(table.tokenHash), index("auth_sessions_user_idx").on(table.userId)]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 254 }),
  phone: varchar("phone", { length: 32 }),
  sessionPrice: numeric("session_price", { precision: 10, scale: 2 }).notNull(),
  sessionsPerMonth: integer("sessions_per_month").notNull().default(4),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("clients_owner_idx").on(table.ownerId), index("clients_owner_active_idx").on(table.ownerId, table.active)]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(50),
  mode: varchar("mode", { length: 20 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("scheduled"),
  absenceJustified: boolean("absence_justified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("appointments_owner_start_idx").on(table.ownerId, table.startsAt), index("appointments_client_idx").on(table.clientId)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("payments_appointment_unique").on(table.appointmentId), index("payments_owner_status_idx").on(table.ownerId, table.status)]);

// Clinical records are deliberately absent from this first schema. When added,
// they must have separate access rules, encryption and audit requirements.
