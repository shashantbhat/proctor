CREATE TABLE "violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"event" text NOT NULL,
	"severity" text NOT NULL,
	"message" text,
	"occurred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "student_responses" ADD COLUMN "violation_ids" uuid[];--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;