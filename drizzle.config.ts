import { defineConfig } from "drizzle-kit";
import { config } from "./src/config";

if (!config.db.url) {
  throw new Error("DB_URL is not set");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: `${config.db.url}`,
  },
});
