CREATE TABLE "device_diagnostics_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"sensor_fail_count" integer NOT NULL,
	"wifi_fail_count" integer NOT NULL,
	"http_fail_count" integer NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_diagnostics_logs" ADD CONSTRAINT "device_diagnostics_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "device_diagnostics_logs_device_id_idx" ON "device_diagnostics_logs" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "device_diagnostics_logs_device_id_recorded_at_idx" ON "device_diagnostics_logs" USING btree ("device_id","recorded_at");--> statement-breakpoint
CREATE INDEX "device_diagnostics_logs_recorded_at_idx" ON "device_diagnostics_logs" USING btree ("recorded_at");