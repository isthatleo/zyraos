CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone" text,
	"alternate_email" text,
	"job_title" text,
	"department" text,
	"employee_code" text,
	"admission_number" text,
	"guardian_contact" text,
	"campus" text,
	"address" text,
	"city" text,
	"country" text,
	"timezone" text,
	"language" text,
	"bio" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"preferred_contact_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "salary_period" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "currency" text DEFAULT 'ZAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;