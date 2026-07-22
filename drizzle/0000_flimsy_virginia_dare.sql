CREATE TYPE "public"."alert_reason" AS ENUM('HIGH_TEMPERATURE', 'LOW_TEMPERATURE', 'DEVICE_OFFLINE', 'DEFROST_DETECTED');--> statement-breakpoint
CREATE TYPE "public"."device_state" AS ENUM('NORMAL', 'DEFROST', 'WARNING', 'CRITICAL', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('WHATSAPP', 'EMAIL', 'TELEGRAM', 'DASHBOARD', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"from_state" "device_state" NOT NULL,
	"to_state" "device_state" NOT NULL,
	"reason_code" "alert_reason" NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"location" varchar(150),
	"normal_min_temperature" numeric(5, 2) NOT NULL,
	"normal_max_temperature" numeric(5, 2) NOT NULL,
	"defrost_min_temperature" numeric(5, 2) NOT NULL,
	"defrost_max_temperature" numeric(5, 2) NOT NULL,
	"warning_min_temperature" numeric(5, 2) NOT NULL,
	"warning_max_temperature" numeric(5, 2) NOT NULL,
	"critical_min_temperature" numeric(5, 2) NOT NULL,
	"state" "device_state" DEFAULT 'NORMAL' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"state_changed_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"recipient" varchar(255),
	"message" text,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temperature_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"temperature" numeric(5, 2) NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "alerts_device_id_idx" ON "alerts" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "alerts_occurred_at_idx" ON "alerts" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "alerts_device_occurred_at_idx" ON "alerts" USING btree ("device_id","occurred_at");--> statement-breakpoint
CREATE INDEX "alerts_reason_code_idx" ON "alerts" USING btree ("reason_code");--> statement-breakpoint
CREATE INDEX "alerts_to_state_idx" ON "alerts" USING btree ("to_state");--> statement-breakpoint
CREATE INDEX "notification_logs_alert_id_idx" ON "notification_logs" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notification_logs_status_idx" ON "notification_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_logs_sent_at_idx" ON "notification_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "temperature_logs_device_id_idx" ON "temperature_logs" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "temperature_logs_device_id_recorded_at_idx" ON "temperature_logs" USING btree ("device_id","recorded_at");--> statement-breakpoint
CREATE INDEX "temperature_logs_recorded_at_idx" ON "temperature_logs" USING btree ("recorded_at");