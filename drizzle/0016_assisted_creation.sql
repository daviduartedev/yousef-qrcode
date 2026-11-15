CREATE TABLE "qrconnect"."ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid,
	"kind" varchar(16) NOT NULL,
	"prompt" text NOT NULL,
	"status" varchar(16) NOT NULL,
	"error" varchar(200),
	"output" jsonb,
	"dropped" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"target_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_generations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."ai_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(80) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_generations" ADD CONSTRAINT "ai_generations_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_generations" ADD CONSTRAINT "ai_generations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_generations" ADD CONSTRAINT "ai_generations_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."ai_sources" ADD CONSTRAINT "ai_sources_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generations_user_created_idx" ON "qrconnect"."ai_generations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_sources_user_idx" ON "qrconnect"."ai_sources" USING btree ("user_id");