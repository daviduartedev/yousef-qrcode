CREATE TABLE "qrconnect"."form_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_type" varchar(16) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" varchar(1024) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."form_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"labels" jsonb NOT NULL,
	"consent_text" varchar(400),
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."form_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(40) NOT NULL,
	"title" varchar(120) NOT NULL,
	"template" varchar(32) NOT NULL,
	"creation_key" uuid NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"accepting_responses" boolean DEFAULT true NOT NULL,
	"qr_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug"),
	CONSTRAINT "forms_user_creation_key_unique" UNIQUE("user_id","creation_key"),
	CONSTRAINT "forms_user_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."form_events" ADD CONSTRAINT "form_events_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "qrconnect"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."form_responses" ADD CONSTRAINT "form_responses_user_id_form_id_forms_user_id_id_fk" FOREIGN KEY ("user_id","form_id") REFERENCES "qrconnect"."forms"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."forms" ADD CONSTRAINT "forms_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."forms" ADD CONSTRAINT "forms_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_events_form_time_idx" ON "qrconnect"."form_events" USING btree ("form_id","occurred_at");--> statement-breakpoint
CREATE INDEX "form_responses_form_created_idx" ON "qrconnect"."form_responses" USING btree ("form_id","created_at");--> statement-breakpoint
CREATE INDEX "forms_user_updated_idx" ON "qrconnect"."forms" USING btree ("user_id","updated_at");