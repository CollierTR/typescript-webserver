import type { MigrationConfig } from "drizzle-orm/migrator";
process.loadEnvFile();

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type APIConfig = {
  fileserverHits: number;
};

type Config = {
  api: APIConfig;
  db: DBConfig;
};

export const config: Config = {
  api: {
    fileserverHits: 0,
  },
  db: {
    url: process.env.DB_URL!,
    migrationConfig: migrationConfig,
  },
};
