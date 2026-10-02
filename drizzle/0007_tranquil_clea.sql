CREATE TABLE `location_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`campaign` text NOT NULL,
	`story_id` text NOT NULL,
	`city_id` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`locale` text NOT NULL,
	`email_consent` integer DEFAULT 0 NOT NULL,
	`whatsapp_consent` integer DEFAULT 0 NOT NULL,
	`consent_version` text NOT NULL,
	`acquisition` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`email_sent_at` text,
	`email_provider_id` text,
	`send_claimed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_session_campaign` ON `location_leads` (`session_id`,`campaign`);--> statement-breakpoint
CREATE INDEX `location_created` ON `location_leads` (`created_at`);