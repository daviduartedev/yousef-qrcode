-- QRConnect: inicialização de um banco PostgreSQL novo e vazio.
-- No Neon, execute este arquivo inteiro no SQL Editor do projeto de homologação.
-- Como alternativa ao SQL, execute db:prepare conforme operacao.md.
-- A restauração recebe o esquema do backup. Mantenha esse destino vazio.
-- Mantém o Better Auth e cria somente a estrutura da aplicação e o histórico do Drizzle.
-- Se houver novas migrations antes do uso, aplique as posteriores pelo Drizzle.

BEGIN;

DO $check$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname IN ('qrconnect', 'qrconnect_migrations')) THEN
    RAISE EXCEPTION 'QRConnect already initialized. Use a new database.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  ) THEN
    RAISE EXCEPTION 'Public schema contains data objects. Use a new database.';
  END IF;
END;
$check$;

-- drizzle/0000_classy_network.sql
CREATE SCHEMA "qrconnect";
CREATE TABLE "qrconnect"."account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "qrconnect"."session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
CREATE TABLE "qrconnect"."user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
CREATE TABLE "qrconnect"."verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "qrconnect"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qrconnect"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "account_user_idx" ON "qrconnect"."account" USING btree ("user_id");
CREATE INDEX "session_user_idx" ON "qrconnect"."session" USING btree ("user_id");
CREATE INDEX "verification_identifier_idx" ON "qrconnect"."verification" USING btree ("identifier");

-- drizzle/0001_crazy_namor.sql
CREATE TABLE "qrconnect"."qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"short_code" varchar(20) NOT NULL,
	"destination_url" text NOT NULL,
	"title" varchar(255),
	"qr_type" varchar(50) DEFAULT 'website' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_scans" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_short_code_unique" UNIQUE("short_code")
);
CREATE TABLE "qrconnect"."qr_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(50),
	"os" varchar(50),
	"browser" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"region" varchar(100)
);
ALTER TABLE "qrconnect"."qr_codes" ADD CONSTRAINT "qr_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "qrconnect"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qrconnect"."qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "qrconnect"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "qr_codes_user_idx" ON "qrconnect"."qr_codes" USING btree ("user_id");
CREATE INDEX "qr_scans_code_time_idx" ON "qrconnect"."qr_scans" USING btree ("qr_code_id","scanned_at");

-- drizzle/0002_thankful_bloodscream.sql
ALTER TABLE "qrconnect"."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qrconnect"."qr_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qrconnect"."qr_scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qrconnect"."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qrconnect"."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qrconnect"."verification" ENABLE ROW LEVEL SECURITY;

-- drizzle/0003_glossy_miss_america.sql
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "design" jsonb;
ALTER TABLE "qrconnect"."qr_codes" ADD COLUMN "tracking_enabled" boolean DEFAULT true NOT NULL;

-- Histórico no mesmo formato de scripts/migrate.ts.
CREATE SCHEMA "qrconnect_migrations";
CREATE TABLE "qrconnect_migrations"."__drizzle_migrations" (
  "id" serial PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" bigint
);

INSERT INTO "qrconnect_migrations"."__drizzle_migrations" ("hash", "created_at") VALUES
  ('c48e056b386c1a752a7c0bfe2498afb2e8c1dacaa13a24b54bc28b93d07602fd', 1793573210645),
  ('f4019c299d0427beacb8f1a6a34be2789822b3ba32eda235c578360a198c6ab8', 1793573434865),
  ('2a8b3daddce0a36984c6697b21c1d183747ac5407a3e9d980e619fb4113cdf81', 1793573638599),
  ('9569e3a7727a75fa5ae8c3bfe2b06e8997b0c3fb37a01221d210bb1eded110d1', 1793606512669);

COMMIT;
