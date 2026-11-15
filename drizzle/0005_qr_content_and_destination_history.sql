CREATE TABLE "qrconnect"."qr_destination_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"previous_url" text NOT NULL,
	"new_url" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_destination_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_destination_changes" ADD CONSTRAINT "qr_destination_changes_user_id_qr_code_id_qr_codes_user_id_id_fk" FOREIGN KEY ("user_id","qr_code_id") REFERENCES "qrconnect"."qr_codes"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_destination_changes_code_time_idx" ON "qrconnect"."qr_destination_changes" USING btree ("user_id","qr_code_id","changed_at");