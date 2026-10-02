CREATE INDEX `entitlements_user_city_active` ON `entitlements` (`user_id`,`city_id`,`active`);--> statement-breakpoint
CREATE INDEX `events_created_at` ON `events` (`created_at`);--> statement-breakpoint
CREATE INDEX `events_session_created` ON `events` (`session_id`,`created_at`);