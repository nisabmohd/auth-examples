import { relations } from "drizzle-orm";
import {
    pgEnum,
    pgTable,
    primaryKey,
    text,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "user"]);

export const userTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull().unique(),
    password: varchar(),
    salt: varchar(),
    fullName: varchar().notNull(),
    role: roleEnum().default("user").notNull(),
});

export const userRelations = relations(userTable, ({ many }) => ({
    oAuthAccounts: many(oauthTable),
}));

export const oAuthProviders = ["discord", "github"] as const;
export type Provider = (typeof oAuthProviders)[number];
export const oAuthProviderEnum = pgEnum("oauth_provides", oAuthProviders);

export const oauthTable = pgTable(
    "user_oauth_accounts",
    {
        userId: uuid()
            .notNull()
            .references(() => userTable.id, { onDelete: "cascade" }),
        provider: oAuthProviderEnum().notNull(),
        providerAccountId: text().notNull().unique(),
    },
    (t) => [primaryKey({ columns: [t.providerAccountId, t.provider] })],
);
