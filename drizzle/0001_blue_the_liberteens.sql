ALTER TABLE "alerts" ALTER COLUMN "reason_code" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."alert_reason";--> statement-breakpoint
CREATE TYPE "public"."alert_reason" AS ENUM('DEFROST_DETECTED', 'WARNING_TEMPERATURE', 'CRITICAL_TEMPERATURE', 'TEMPERATURE_RECOVERED', 'DEVICE_OFFLINE', 'DEVICE_RECOVERED');--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "reason_code" SET DATA TYPE "public"."alert_reason" USING "reason_code"::"public"."alert_reason";