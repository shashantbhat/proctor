CREATE TABLE "speech_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"transcript" text NOT NULL,
	"cheating_probability" varchar(10) NOT NULL,
	"issues_detected" jsonb NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "one_analysis_per_student" UNIQUE("test_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "speech_analysis" ADD CONSTRAINT "speech_analysis_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_analysis" ADD CONSTRAINT "speech_analysis_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;