CREATE TABLE "qrconnect"."api_key_usage" (
	"key_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"requests" integer NOT NULL,
	CONSTRAINT "api_key_usage_key_id_window_start_pk" PRIMARY KEY("key_id","window_start")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."api_key_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"prefix" varchar(12) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event" varchar(40) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(16) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_status_code" integer,
	"last_error" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."webhook_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"events" jsonb NOT NULL,
	"secret_encrypted" varchar(200) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."api_key_usage" ADD CONSTRAINT "api_key_usage_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "qrconnect"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."api_keys" ADD CONSTRAINT "api_keys_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "qrconnect"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."webhooks" ADD CONSTRAINT "webhooks_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "qrconnect"."api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_hook_created_idx" ON "qrconnect"."webhook_deliveries" USING btree ("webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "qrconnect"."webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhooks_user_idx" ON "qrconnect"."webhooks" USING btree ("user_id");