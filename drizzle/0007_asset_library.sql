CREATE TABLE "qrconnect"."asset_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_folders_user_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "asset_folders_user_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."asset_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" varchar(120) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"sha256" varchar(64) NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_user_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."asset_folders" ADD CONSTRAINT "asset_folders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."assets" ADD CONSTRAINT "assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."assets" ADD CONSTRAINT "assets_user_id_folder_id_asset_folders_user_id_id_fk" FOREIGN KEY ("user_id","folder_id") REFERENCES "qrconnect"."asset_folders"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_user_created_idx" ON "qrconnect"."assets" USING btree ("user_id","created_at");