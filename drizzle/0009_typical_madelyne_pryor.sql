CREATE TABLE `ebook_purchases` (
	`provider_order_id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`buyer_email` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`delivered_at` text,
	`email_provider_id` text,
	`delivery_attempts` integer DEFAULT 0 NOT NULL,
	`delivery_error` text
);
--> statement-breakpoint
CREATE INDEX `ebook_buyer_status` ON `ebook_purchases` (`buyer_email`,`status`);--> statement-breakpoint
CREATE INDEX `ebook_delivery` ON `ebook_purchases` (`status`,`delivered_at`);