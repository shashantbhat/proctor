ALTER TABLE "student_responses" ADD COLUMN "suspicious_activities" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "student_responses" ADD COLUMN "proctoring_summary" jsonb;--> statement-breakpoint
ALTER TABLE "student_responses" DROP COLUMN "violations";