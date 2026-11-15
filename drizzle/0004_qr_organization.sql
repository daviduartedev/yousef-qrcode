CREATE TABLE "qrconnect"."qr_code_labels" (
	"user_id" uuid NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "qr_code_labels_user_id_qr_code_id_label_id_pk" PRIMARY KEY("user_id","qr_code_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_code_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."qr_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."qr_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	CONSTRAINT "qr_labels_user_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "watched" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_user_id_unique" UNIQUE("user_id","id");--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_code_labels" ADD CONSTRAINT "qr_code_labels_user_id_qr_code_id_qr_codes_user_id_id_fk" FOREIGN KEY ("user_id","qr_code_id") REFERENCES "qrconnect"."qr_codes"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_code_labels" ADD CONSTRAINT "qr_code_labels_user_id_label_id_qr_labels_user_id_id_fk" FOREIGN KEY ("user_id","label_id") REFERENCES "qrconnect"."qr_labels"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_folders" ADD CONSTRAINT "qr_folders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_labels" ADD CONSTRAINT "qr_labels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_code_labels_label_idx" ON "qrconnect"."qr_code_labels" USING btree ("user_id","label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_folders_user_name_idx" ON "qrconnect"."qr_folders" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "qr_labels_user_name_idx" ON "qrconnect"."qr_labels" USING btree ("user_id",lower("name"));--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_folder_id_qr_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "qrconnect"."qr_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_codes_folder_idx" ON "qrconnect"."qr_codes" USING btree ("folder_id");
