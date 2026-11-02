CREATE TABLE "qrconnect"."qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"short_code" varchar(20) NOT NULL,
	"destination_url" text NOT NULL,
	"title" varchar(255),
	"qr_type" varchar(50) DEFAULT 'website' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_scans" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "qrconnect"."qr_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(50),
	"os" varchar(50),
	"browser" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"region" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_codes_user_idx" ON "qrconnect"."qr_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qr_scans_code_time_idx" ON "qrconnect"."qr_scans" USING btree ("qr_code_id","scanned_at");
