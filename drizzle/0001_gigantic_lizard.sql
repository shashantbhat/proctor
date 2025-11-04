CREATE TABLE "test_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"enrollment_no" varchar(50) NOT NULL,
	"semester" varchar(10) NOT NULL,
	"batch" varchar(50) NOT NULL,
	"branch" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "duration_minutes" varchar(10);--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "start_time" timestamp;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "end_time" timestamp;--> statement-breakpoint
ALTER TABLE "test_participants" ADD CONSTRAINT "test_participants_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_participants" ADD CONSTRAINT "test_participants_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;