CREATE TABLE "qrconnect"."workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"role" varchar(16) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "workspace_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qrconnect"."workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qrconnect"."workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qrconnect"."asset_folders" DROP CONSTRAINT "asset_folders_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."assets" DROP CONSTRAINT "assets_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."cards" DROP CONSTRAINT "cards_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."forms" DROP CONSTRAINT "forms_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."link_pages" DROP CONSTRAINT "link_pages_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."public_slugs" DROP CONSTRAINT "public_slugs_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" DROP CONSTRAINT "qr_codes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_folders" DROP CONSTRAINT "qr_folders_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_labels" DROP CONSTRAINT "qr_labels_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."workspace_members" ADD CONSTRAINT "workspace_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."workspaces" ADD CONSTRAINT "workspaces_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "qrconnect"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Every existing account becomes the owner of a personal workspace with the same id, so all content keeps its owner.
INSERT INTO "qrconnect"."workspaces" ("id", "name", "kind", "created_by", "created_at")
  SELECT "id", left("name", 80), 'personal', "id", "created_at" FROM "qrconnect"."user" ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "qrconnect"."workspace_members" ("workspace_id", "user_id", "role", "created_at")
  SELECT "id", "id", 'owner', "created_at" FROM "qrconnect"."user" ON CONFLICT DO NOTHING;--> statement-breakpoint
-- New accounts get their personal workspace in the same transaction, whatever code version creates them.
CREATE OR REPLACE FUNCTION "qrconnect"."create_personal_workspace"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "qrconnect"."workspaces" ("id", "name", "kind", "created_by") VALUES (NEW."id", left(NEW."name", 80), 'personal', NEW."id") ON CONFLICT DO NOTHING;
  INSERT INTO "qrconnect"."workspace_members" ("workspace_id", "user_id", "role") VALUES (NEW."id", NEW."id", 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "user_personal_workspace" AFTER INSERT ON "qrconnect"."user" FOR EACH ROW EXECUTE FUNCTION "qrconnect"."create_personal_workspace"();--> statement-breakpoint
-- Deleting an account deletes its personal content, as before; organizations keep theirs.
CREATE OR REPLACE FUNCTION "qrconnect"."delete_personal_workspace"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "qrconnect"."workspaces" WHERE "id" = OLD."id" AND "kind" = 'personal';
  RETURN OLD;
END $$;--> statement-breakpoint
CREATE TRIGGER "user_delete_personal_workspace" AFTER DELETE ON "qrconnect"."user" FOR EACH ROW EXECUTE FUNCTION "qrconnect"."delete_personal_workspace"();--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_idx" ON "qrconnect"."workspace_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "qrconnect"."workspace_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "qrconnect"."asset_folders" ADD CONSTRAINT "asset_folders_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."assets" ADD CONSTRAINT "assets_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."cards" ADD CONSTRAINT "cards_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."forms" ADD CONSTRAINT "forms_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."link_pages" ADD CONSTRAINT "link_pages_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."public_slugs" ADD CONSTRAINT "public_slugs_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_folders" ADD CONSTRAINT "qr_folders_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qrconnect"."qr_labels" ADD CONSTRAINT "qr_labels_user_id_workspaces_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."workspaces"("id") ON DELETE cascade ON UPDATE no action;