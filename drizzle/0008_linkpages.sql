CREATE TABLE "qrconnect"."link_page_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"kind" varchar(8) NOT NULL,
	"block_id" varchar(24),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_type" varchar(16) NOT NULL,
	"os" varchar(32) NOT NULL,
	"browser" varchar(32) NOT NULL,
	"country" varchar(100),
	"ip_address" varchar(64),
	"user_agent" varchar(1024) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."link_page_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."link_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(40) NOT NULL,
	"title" varchar(80) NOT NULL,
	"template" varchar(32) NOT NULL,
	"creation_key" uuid NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"qr_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_pages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "link_pages_user_creation_key_unique" UNIQUE("user_id","creation_key")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."link_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."public_slugs" (
	"kind" varchar(16) NOT NULL,
	"slug" varchar(40) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_slugs_kind_slug_pk" PRIMARY KEY("kind","slug")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."public_slugs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."link_page_events" ADD CONSTRAINT "link_page_events_page_id_link_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "qrconnect"."link_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."link_pages" ADD CONSTRAINT "link_pages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."link_pages" ADD CONSTRAINT "link_pages_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."public_slugs" ADD CONSTRAINT "public_slugs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_page_events_page_time_idx" ON "qrconnect"."link_page_events" USING btree ("page_id","occurred_at");--> statement-breakpoint
CREATE INDEX "link_pages_user_updated_idx" ON "qrconnect"."link_pages" USING btree ("user_id","updated_at");