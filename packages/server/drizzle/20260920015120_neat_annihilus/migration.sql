CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"mode" text,
	"provider" text,
	"model" text,
	"status" text DEFAULT 'done' NOT NULL,
	"error" text,
	"parts" jsonb NOT NULL,
	"client_message_id" text,
	"seq" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"title" text,
	"mode" text DEFAULT 'plan' NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"model" text DEFAULT 'eco' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_session_seq_uidx" ON "chat_message" ("chat_session_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_session_clientMessageId_uidx" ON "chat_message" ("chat_session_id","client_message_id");--> statement-breakpoint
CREATE INDEX "chat_message_chatSessionId_idx" ON "chat_message" ("chat_session_id");--> statement-breakpoint
CREATE INDEX "chat_session_workspaceId_lastMessageAt_idx" ON "chat_session" ("workspace_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_userId_path_uidx" ON "workspace" ("user_id","path");--> statement-breakpoint
CREATE INDEX "workspace_userId_idx" ON "workspace" ("user_id");--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chat_session_id_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;