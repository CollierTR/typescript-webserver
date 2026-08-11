CREATE TABLE "refreshTokens" (
	"token" varchar(265) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "refreshTokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;