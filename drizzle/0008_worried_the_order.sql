ALTER TABLE "devices" ADD COLUMN "defrost_threshold" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "warning_threshold" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "critical_threshold" numeric(5, 2);