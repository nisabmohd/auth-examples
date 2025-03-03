import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" }); // or .env.local

export default defineConfig({
    out: "./db/drizzle/migrations",
    schema: "./db/drizzle/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
