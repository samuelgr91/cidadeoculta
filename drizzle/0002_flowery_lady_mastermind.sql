CREATE TABLE `pass_transfers` (
	`legacy_user_id` text PRIMARY KEY NOT NULL,
	`account_user_id` text NOT NULL,
	`nonce` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pass_transfers_nonce_unique` ON `pass_transfers` (`nonce`);