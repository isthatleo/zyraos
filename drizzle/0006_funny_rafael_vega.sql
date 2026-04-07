CREATE TABLE "gradebook" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"class_id" text NOT NULL,
	"term_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"assessment_type" text NOT NULL,
	"assessment_name" text NOT NULL,
	"score" numeric(5, 2),
	"max_score" numeric(5, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"grade" text,
	"weight" numeric(3, 2) DEFAULT '1' NOT NULL,
	"assessment_date" timestamp NOT NULL,
	"teacher_id" text NOT NULL,
	"notes" text,
	"is_excused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grading_scales" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scale_type" text NOT NULL,
	"min_score" numeric(5, 2) NOT NULL,
	"max_score" numeric(5, 2) NOT NULL,
	"grade" text NOT NULL,
	"grade_point" numeric(3, 2),
	"description" text,
	"color" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_card_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"thumbnail" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"grade_level" text,
	"created_by" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"report_card_number" text NOT NULL,
	"template_id" text,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"term_id" text,
	"academic_year_id" text NOT NULL,
	"report_type" text NOT NULL,
	"overall_grade" text,
	"overall_percentage" numeric(5, 2),
	"gpa" numeric(3, 2),
	"rank" integer,
	"total_students" integer,
	"attendance_days" integer DEFAULT 0 NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"attendance_percentage" numeric(5, 2),
	"teacher_comments" text,
	"principal_comments" text,
	"parent_comments" text,
	"issued_date" timestamp DEFAULT now() NOT NULL,
	"issued_by" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"sent_at" timestamp,
	"printed_at" timestamp,
	"pdf_url" text,
	"metadata" jsonb,
	"grades_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_cards_report_card_number_unique" UNIQUE("report_card_number")
);
--> statement-breakpoint
CREATE TABLE "student_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"term_id" text,
	"subject_id" text,
	"progress_type" text NOT NULL,
	"progress_date" timestamp NOT NULL,
	"progress_value" numeric(5, 2),
	"progress_note" text,
	"recorded_by" text NOT NULL,
	"is_positive" boolean DEFAULT true NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "receipt_templates_created_by_idx";--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook" ADD CONSTRAINT "gradebook_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_template_id_report_card_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_card_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gradebook_student_id_idx" ON "gradebook" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gradebook_subject_id_idx" ON "gradebook" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "gradebook_class_id_idx" ON "gradebook" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "gradebook_term_id_idx" ON "gradebook" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "gradebook_academic_year_id_idx" ON "gradebook" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "grading_scales_scale_type_idx" ON "grading_scales" USING btree ("scale_type");--> statement-breakpoint
CREATE INDEX "grading_scales_is_default_idx" ON "grading_scales" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "report_card_templates_created_by_idx" ON "report_card_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "report_card_templates_category_idx" ON "report_card_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "report_card_templates_grade_level_idx" ON "report_card_templates" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "report_card_templates_is_default_idx" ON "report_card_templates" USING btree ("is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "report_cards_report_card_number_unique" ON "report_cards" USING btree ("report_card_number");--> statement-breakpoint
CREATE INDEX "report_cards_student_id_idx" ON "report_cards" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "report_cards_class_id_idx" ON "report_cards" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "report_cards_term_id_idx" ON "report_cards" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "report_cards_academic_year_id_idx" ON "report_cards" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "report_cards_status_idx" ON "report_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_cards_issued_date_idx" ON "report_cards" USING btree ("issued_date");--> statement-breakpoint
CREATE INDEX "student_progress_student_id_idx" ON "student_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_progress_academic_year_id_idx" ON "student_progress" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "student_progress_term_id_idx" ON "student_progress" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "student_progress_subject_id_idx" ON "student_progress" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "student_progress_progress_type_idx" ON "student_progress" USING btree ("progress_type");--> statement-breakpoint
ALTER TABLE "receipt_templates" DROP COLUMN "created_by";