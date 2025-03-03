import { pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "user"]);

export const usersTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull().unique(),
    password: varchar().notNull(),
    salt: varchar().notNull(),
    fullName: varchar().notNull(),
    role: roleEnum().default("user").notNull(),
});
