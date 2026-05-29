ALTER TABLE "monitor_group" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "monitor_group" ADD CONSTRAINT "monitor_group_parent_id_monitor_group_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."monitor_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monitor_group_parent_idx" ON "monitor_group" USING btree ("parent_id");