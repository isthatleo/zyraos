DROP INDEX "receipts_receipt_number_unique";--> statement-breakpoint
DROP INDEX "report_cards_report_card_number_unique";--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "currency" text DEFAULT 'ZAR' NOT NULL;