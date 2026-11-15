CREATE TABLE "qrconnect"."qr_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"design" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_templates" ADD CONSTRAINT "qr_templates_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_templates" ADD CONSTRAINT "qr_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_templates_user_created_idx" ON "qrconnect"."qr_templates" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Codes in personal workspaces were created by the account that owns them.
UPDATE "qrconnect"."qr_codes" q SET "created_by" = q."user_id" FROM "qrconnect"."workspaces" w WHERE w."id" = q."user_id" AND w."kind" = 'personal';
