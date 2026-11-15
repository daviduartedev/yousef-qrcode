CREATE TABLE "qrconnect"."account_email_dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."account_email_dispatches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."account_email_dispatches" ADD CONSTRAINT "account_email_dispatches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_email_dispatches_user_kind_time_idx" ON "qrconnect"."account_email_dispatches" USING btree ("user_id","kind","created_at");