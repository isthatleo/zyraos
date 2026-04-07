CREATE TABLE "receipt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"thumbnail" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"template_id" text,
	"student_id" text NOT NULL,
	"payment_id" text,
	"student_fee_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"payment_method" text,
	"payment_date" timestamp NOT NULL,
	"issued_date" timestamp DEFAULT now() NOT NULL,
	"issued_by" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"sent_at" timestamp,
	"printed_at" timestamp,
	"voided_at" timestamp,
	"voided_reason" text,
	"pdf_url" text,
	"metadata" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_template_id_receipt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."receipt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_student_fee_id_student_fees_id_fk" FOREIGN KEY ("student_fee_id") REFERENCES "public"."student_fees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_templates_created_by_idx" ON "receipt_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "receipt_templates_category_idx" ON "receipt_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "receipt_templates_is_default_idx" ON "receipt_templates" USING btree ("is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_receipt_number_unique" ON "receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_student_id_idx" ON "receipts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "receipts_payment_id_idx" ON "receipts" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "receipts_status_idx" ON "receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "receipts_issued_date_idx" ON "receipts" USING btree ("issued_date");