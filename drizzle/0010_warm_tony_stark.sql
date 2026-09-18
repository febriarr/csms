ALTER TABLE "devices" ALTER COLUMN "defrost_threshold" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "warning_threshold" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "critical_threshold" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "normal_min_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "normal_max_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "defrost_min_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "defrost_max_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "warning_min_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "warning_max_temperature";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "critical_min_temperature";