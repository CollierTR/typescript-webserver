ALTER TABLE "users" ALTER COLUMN "hashed_password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "hashed_password" SET DEFAULT 'unset';