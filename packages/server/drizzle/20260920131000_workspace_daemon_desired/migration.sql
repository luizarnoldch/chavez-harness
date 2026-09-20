ALTER TABLE "workspace" ADD COLUMN "daemon_desired" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "daemon_desired_source" text;
