import { pgTable, timestamp, varchar, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hashedPassword: varchar("hashed_password", { length: 255 })
    .notNull()
    .default("unset"),
});

export type NewUser = typeof users.$inferInsert;

export const chirps = pgTable("chirps", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  body: varchar("body", { length: 150 }).notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const NewChirp = typeof chirps.$inferInsert;

export const refreshTokens = pgTable("refreshTokens", {
  token: varchar("token", { length: 265 }).primaryKey().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export const NewRefreshToken = typeof refreshTokens.$inferInsert;
