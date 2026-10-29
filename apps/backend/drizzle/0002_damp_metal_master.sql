TRUNCATE TABLE "temperature_logs";
CREATE TYPE "public"."reading_evaluation" AS ENUM('EVALUATED', 'PAUSED', 'PULLING_DOWN', 'DEVICE_INACTIVE', 'LATE_ARRIVAL');--> statement-breakpoint
CREATE TYPE "public"."temperature_state" AS ENUM('NORMAL', 'DEFROST', 'WARNING', 'CRITICAL');--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD COLUMN "state" "temperature_state" NOT NULL;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD COLUMN "evaluation" "reading_evaluation" NOT NULL;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD COLUMN "pause_id" uuid;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_pause_id_monitoring_pauses_id_fk" FOREIGN KEY ("pause_id") REFERENCES "public"."monitoring_pauses"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "temperature_logs_pause_idx" ON "temperature_logs" USING btree ("pause_id") WHERE "temperature_logs"."pause_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_pause_chk" CHECK ("temperature_logs"."pause_id" IS NULL OR "temperature_logs"."evaluation" IN ('PAUSED', 'PULLING_DOWN'));