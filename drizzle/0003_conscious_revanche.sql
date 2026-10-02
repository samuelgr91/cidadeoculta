CREATE TABLE `kiwify_purchases` (
	`provider_order_id` text PRIMARY KEY NOT NULL,
	`local_order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`buyer_email` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`notified_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kiwify_purchases_local_order_id_unique` ON `kiwify_purchases` (`local_order_id`);