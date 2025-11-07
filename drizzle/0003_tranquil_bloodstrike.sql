CREATE TABLE "student_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"answers" jsonb,
	"started_at" timestamp DEFAULT now(),
	"submitted_at" timestamp
);
--> statement-breakpoint
DROP TABLE "responses" CASCADE;--> statement-breakpoint
DROP TABLE "student_answers" CASCADE;--> statement-breakpoint
DROP TABLE "test_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "test_participants" RENAME COLUMN "created_at" TO "joined_at";--> statement-breakpoint
ALTER TABLE "student_responses" ADD CONSTRAINT "student_responses_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_responses" ADD CONSTRAINT "student_responses_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;