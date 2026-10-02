CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cities_slug_unique` ON `cities` (`slug`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`city_id` text NOT NULL,
	`order_id` text NOT NULL,
	`mode` text NOT NULL,
	`active` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entitlements_order_id_unique` ON `entitlements` (`order_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city_id` text,
	`story_id` text,
	`locale` text,
	`session_id` text,
	`acquisition` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`email` text NOT NULL,
	`city_id` text NOT NULL,
	`locale` text NOT NULL,
	`consent` integer NOT NULL,
	`acquisition` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_session_city` ON `leads` (`session_id`,`city_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`city_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_provider_id_unique` ON `orders` (`provider_id`);--> statement-breakpoint
CREATE TABLE `progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`story_id` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_user_story` ON `progress` (`user_id`,`story_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`consent` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`location_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `story_translations` (
	`story_id` text NOT NULL,
	`city_id` text NOT NULL,
	`locale` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_locale` ON `story_translations` (`story_id`,`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `city_locale_slug` ON `story_translations` (`city_id`,`locale`,`slug`);