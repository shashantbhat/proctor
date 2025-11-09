CREATE TABLE "student_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"question_id" text NOT NULL,
	"answer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"submitted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;