ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "design" jsonb;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "tracking_enabled" boolean DEFAULT true NOT NULL;