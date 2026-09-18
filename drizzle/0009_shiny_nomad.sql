ALTER TABLE "devices" ALTER COLUMN "normal_min_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "normal_max_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "defrost_min_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "defrost_max_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "warning_min_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "warning_max_temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "critical_min_temperature" DROP NOT NULL;