CREATE TABLE "qrconnect"."card_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254),
	"phone" varchar(32),
	"company" varchar(120),
	"message" varchar(1000),
	"consent_text" varchar(400) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."card_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."card_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"target" varchar(24),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_type" varchar(16) NOT NULL,
	"os" varchar(32) NOT NULL,
	"browser" varchar(32) NOT NULL,
	"country" varchar(100),
	"ip_address" varchar(64),
	"user_agent" varchar(1024) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."card_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(40) NOT NULL,
	"title" varchar(80) NOT NULL,
	"creation_key" uuid NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"qr_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_slug_unique" UNIQUE("slug"),
	CONSTRAINT "cards_user_creation_key_unique" UNIQUE("user_id","creation_key"),
	CONSTRAINT "cards_user_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."card_contacts" ADD CONSTRAINT "card_contacts_user_id_card_id_cards_user_id_id_fk" FOREIGN KEY ("user_id","card_id") REFERENCES "qrconnect"."cards"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."card_events" ADD CONSTRAINT "card_events_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "qrconnect"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."cards" ADD CONSTRAINT "cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."cards" ADD CONSTRAINT "cards_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_contacts_user_created_idx" ON "qrconnect"."card_contacts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "card_events_card_time_idx" ON "qrconnect"."card_events" USING btree ("card_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cards_user_updated_idx" ON "qrconnect"."cards" USING btree ("user_id","updated_at");