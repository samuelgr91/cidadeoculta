CREATE TABLE `funnel_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`step` integer NOT NULL,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`claimed_at` text,
	`sent_at` text,
	`provider_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` text,
	FOREIGN KEY (`subscription_id`) REFERENCES `funnel_subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `funnel_subscription_step` ON `funnel_messages` (`subscription_id`,`step`);--> statement-breakpoint
CREATE INDEX `funnel_due` ON `funnel_messages` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `funnel_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`city_id` text NOT NULL,
	`locale` text NOT NULL,
	`campaign` text NOT NULL,
	`consent_at` text NOT NULL,
	`consent_version` text NOT NULL,
	`unsubscribed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `funnel_email_city` ON `funnel_subscriptions` (`email`,`city_id`);--> statement-breakpoint
CREATE TABLE `funnel_suppressions` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
