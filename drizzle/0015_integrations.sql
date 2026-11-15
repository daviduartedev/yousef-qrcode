DROP INDEX "qrconnect"."webhooks_user_idx";--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ALTER COLUMN "secret_encrypted" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ADD COLUMN "kind" varchar(16) DEFAULT 'webhook' NOT NULL;--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ADD COLUMN "label" varchar(80);--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "webhooks_user_idx" ON "qrconnect"."webhooks" USING btree ("user_id","kind");