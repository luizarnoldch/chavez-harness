ALTER TABLE "chat_session" ADD COLUMN "cursor_agent_id" text;--> statement-breakpoint
ALTER TABLE "chat_session" ALTER COLUMN "provider" SET DEFAULT 'cursor';--> statement-breakpoint
ALTER TABLE "chat_session" ALTER COLUMN "model" SET DEFAULT 'auto';