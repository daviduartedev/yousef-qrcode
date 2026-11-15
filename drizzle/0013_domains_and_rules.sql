CREATE TABLE "qrconnect"."custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hostname" varchar(253) NOT NULL,
	"ever_used" boolean DEFAULT false NOT NULL,
	"verification_token" varchar(64) NOT NULL,
	"verified_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_user_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "custom_domains_user_hostname_unique" UNIQUE("user_id","hostname")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."custom_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."qr_aliases" (
	"alias" varchar(32) PRIMARY KEY NOT NULL,
	"qr_code_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."qr_unlock_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"ip_address" varchar(64),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_unlock_failures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "rules" jsonb;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "tracking_host" varchar(253);--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_scans" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_scans" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "qrconnect"."custom_domains" ADD CONSTRAINT "custom_domains_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_aliases" ADD CONSTRAINT "qr_aliases_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_aliases" ADD CONSTRAINT "qr_aliases_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_unlock_failures" ADD CONSTRAINT "qr_unlock_failures_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_verified_hostname_unique" ON "qrconnect"."custom_domains" USING btree ("hostname") WHERE verified_at is not null;--> statement-breakpoint
CREATE INDEX "qr_aliases_code_idx" ON "qrconnect"."qr_aliases" USING btree ("qr_code_id");--> statement-breakpoint
CREATE INDEX "qr_unlock_failures_code_time_idx" ON "qrconnect"."qr_unlock_failures" USING btree ("qr_code_id","occurred_at");