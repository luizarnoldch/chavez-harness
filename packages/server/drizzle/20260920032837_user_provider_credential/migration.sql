CREATE TABLE "user_provider_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"ciphertext" text NOT NULL,
	"nonce" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"hint" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_credential_user_provider_uidx" ON "user_provider_credential" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "user_provider_credential_userId_idx" ON "user_provider_credential" ("user_id");--> statement-breakpoint
ALTER TABLE "user_provider_credential" ADD CONSTRAINT "user_provider_credential_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;