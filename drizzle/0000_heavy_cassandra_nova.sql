CREATE TABLE `shops` (
	`owner` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'My Kirana Store' NOT NULL,
	`shopkeeper` text DEFAULT 'Shopkeeper' NOT NULL,
	`demo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transactions_owner_idx` ON `transactions` (`owner`);