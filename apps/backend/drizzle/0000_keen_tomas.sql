CREATE TYPE "public"."alert_reason" AS ENUM('DEFROST_DETECTED', 'WARNING_TEMPERATURE', 'CRITICAL_TEMPERATURE', 'TEMPERATURE_RECOVERED', 'DEVICE_OFFLINE', 'DEVICE_RECOVERED');--> statement-breakpoint
CREATE TYPE "public"."device_state" AS ENUM('NORMAL', 'DEFROST', 'WARNING', 'CRITICAL', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('WHATSAPP', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."pause_kind" AS ENUM('MAINTENANCE', 'MACHINE_OFF');--> statement-breakpoint
CREATE TYPE "public"."reset_reason" AS ENUM('BROWNOUT', 'PANIC', 'WATCHDOG', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."subscription_scope" AS ENUM('ALL', 'DIVISION', 'LOCATION', 'COLD_STORAGE', 'DEVICE');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"from_state" "device_state" NOT NULL,
	"to_state" "device_state" NOT NULL,
	"reason_code" "alert_reason" NOT NULL,
	"reason" text,
	"temperature" real,
	"occurred_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cold_storages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_diagnostics_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "device_diagnostics_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_id" uuid NOT NULL,
	"sensor_fail_count" integer NOT NULL,
	"wifi_fail_count" integer NOT NULL,
	"http_fail_count" integer NOT NULL,
	"rssi" smallint,
	"reset_reason" "reset_reason",
	"reset_reason_code" smallint,
	"last_rssi" smallint,
	"last_sensor_fail_count" integer,
	"last_wifi_fail_count" integer,
	"last_http_fail_count" integer,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_diagnostics_logs_counts_chk" CHECK ("device_diagnostics_logs"."sensor_fail_count" >= 0 AND "device_diagnostics_logs"."wifi_fail_count" >= 0 AND "device_diagnostics_logs"."http_fail_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"cold_storage_id" uuid NOT NULL,
	"point_label" varchar(100),
	"defrost_threshold" numeric(5, 2),
	"warning_threshold" numeric(5, 2) NOT NULL,
	"critical_threshold" numeric(5, 2) NOT NULL,
	"heartbeat_interval_seconds" integer DEFAULT 30 NOT NULL,
	"firmware_version" varchar(32),
	"state" "device_state" DEFAULT 'NORMAL' NOT NULL,
	"state_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_temperature" real,
	"last_recorded_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_threshold_order_chk" CHECK (("devices"."defrost_threshold" IS NULL OR "devices"."defrost_threshold" < "devices"."warning_threshold")
       AND "devices"."warning_threshold" < "devices"."critical_threshold"),
	CONSTRAINT "devices_heartbeat_chk" CHECK ("devices"."heartbeat_interval_seconds" > 0)
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "monitoring_pauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid,
	"cold_storage_id" uuid,
	"kind" "pause_kind" NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"max_pulldown_minutes" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_by" uuid,
	"ended_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_pauses_one_target_chk" CHECK (num_nonnulls("monitoring_pauses"."device_id", "monitoring_pauses"."cold_storage_id") = 1),
	CONSTRAINT "monitoring_pauses_range_chk" CHECK ("monitoring_pauses"."ends_at" IS NULL OR "monitoring_pauses"."ends_at" > "monitoring_pauses"."starts_at"),
	CONSTRAINT "monitoring_pauses_pulldown_chk" CHECK ("monitoring_pauses"."max_pulldown_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"recipient_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"recipient" varchar(255),
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" smallint DEFAULT 0 NOT NULL,
	"message" text,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"division_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"target" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"scope" "subscription_scope" NOT NULL,
	"division_id" uuid,
	"location_id" uuid,
	"cold_storage_id" uuid,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_subscriptions_target_uniq" UNIQUE NULLS NOT DISTINCT("recipient_id","scope","division_id","location_id","cold_storage_id","device_id"),
	CONSTRAINT "notification_subscriptions_scope_chk" CHECK (("notification_subscriptions"."scope" = 'ALL' AND num_nonnulls("notification_subscriptions"."division_id", "notification_subscriptions"."location_id", "notification_subscriptions"."cold_storage_id", "notification_subscriptions"."device_id") = 0)
       OR ("notification_subscriptions"."scope" = 'DIVISION' AND "notification_subscriptions"."division_id" IS NOT NULL AND num_nonnulls("notification_subscriptions"."location_id", "notification_subscriptions"."cold_storage_id", "notification_subscriptions"."device_id") = 0)
       OR ("notification_subscriptions"."scope" = 'LOCATION' AND "notification_subscriptions"."location_id" IS NOT NULL AND num_nonnulls("notification_subscriptions"."division_id", "notification_subscriptions"."cold_storage_id", "notification_subscriptions"."device_id") = 0)
       OR ("notification_subscriptions"."scope" = 'COLD_STORAGE' AND "notification_subscriptions"."cold_storage_id" IS NOT NULL AND num_nonnulls("notification_subscriptions"."division_id", "notification_subscriptions"."location_id", "notification_subscriptions"."device_id") = 0)
       OR ("notification_subscriptions"."scope" = 'DEVICE' AND "notification_subscriptions"."device_id" IS NOT NULL AND num_nonnulls("notification_subscriptions"."division_id", "notification_subscriptions"."location_id", "notification_subscriptions"."cold_storage_id") = 0))
);
--> statement-breakpoint
CREATE TABLE "temperature_logs" (
	"device_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"temperature" real NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "temperature_logs_device_id_recorded_at_pk" PRIMARY KEY("device_id","recorded_at")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cold_storages" ADD CONSTRAINT "cold_storages_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "device_diagnostics_logs" ADD CONSTRAINT "device_diagnostics_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_cold_storage_id_cold_storages_id_fk" FOREIGN KEY ("cold_storage_id") REFERENCES "public"."cold_storages"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monitoring_pauses" ADD CONSTRAINT "monitoring_pauses_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monitoring_pauses" ADD CONSTRAINT "monitoring_pauses_cold_storage_id_cold_storages_id_fk" FOREIGN KEY ("cold_storage_id") REFERENCES "public"."cold_storages"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monitoring_pauses" ADD CONSTRAINT "monitoring_pauses_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monitoring_pauses" ADD CONSTRAINT "monitoring_pauses_ended_by_user_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipient_id_notification_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."notification_recipients"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_recipient_id_notification_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."notification_recipients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_cold_storage_id_cold_storages_id_fk" FOREIGN KEY ("cold_storage_id") REFERENCES "public"."cold_storages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "alerts_device_occurred_at_idx" ON "alerts" USING btree ("device_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alerts_occurred_at_idx" ON "alerts" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "cold_storages_location_name_uidx" ON "cold_storages" USING btree ("location_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "device_diagnostics_logs_device_recorded_uidx" ON "device_diagnostics_logs" USING btree ("device_id","recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "device_diagnostics_logs_recorded_at_idx" ON "device_diagnostics_logs" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_code_active_uidx" ON "devices" USING btree ("code") WHERE "devices"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "devices_cold_storage_id_idx" ON "devices" USING btree ("cold_storage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_storage_point_uidx" ON "devices" USING btree ("cold_storage_id","point_label") WHERE "devices"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "locations_divisions_id_idx" ON "locations" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "monitoring_pauses_device_idx" ON "monitoring_pauses" USING btree ("device_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monitoring_pauses_cold_storage_idx" ON "monitoring_pauses" USING btree ("cold_storage_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notification_logs_alert_id_idx" ON "notification_logs" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "notification_logs_open_idx" ON "notification_logs" USING btree ("created_at") WHERE "notification_logs"."status" <> 'SUCCESS';--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipients_channel_target_uidx" ON "notification_recipients" USING btree ("channel","target");--> statement-breakpoint
CREATE INDEX "notification_recipients_active_channel_idx" ON "notification_recipients" USING btree ("channel") WHERE "notification_recipients"."is_active";--> statement-breakpoint
CREATE INDEX "notification_subscriptions_recipient_idx" ON "notification_subscriptions" USING btree ("recipient_id");