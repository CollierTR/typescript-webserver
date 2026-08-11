import type { MigrationConfig } from "drizzle-orm/migrator";
process.loadEnvFile();

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
  platform: string;
};

type APIConfig = {
  fileserverHits: number;
  signingSecret: string;
};

type Config = {
  api: APIConfig;
  db: DBConfig;
};

export const config: Config = {
  api: {
    fileserverHits: 0,
    signingSecret: process.env.SIGNING_KEY!,
  },
  db: {
    url: process.env.DB_URL!,
    migrationConfig: migrationConfig,
    platform: process.env.PLATFORM!,
  },
};
