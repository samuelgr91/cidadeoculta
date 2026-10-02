CREATE TABLE `analytics_excluded_visitors` (
	`visitor_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_page_views` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`visit_id` text NOT NULL,
	`path` text NOT NULL,
	`device` text NOT NULL,
	`os` text NOT NULL,
	`browser` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_created` ON `analytics_page_views` (`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_visitor_created` ON `analytics_page_views` (`visitor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_visit` ON `analytics_page_views` (`visit_id`);