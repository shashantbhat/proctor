ALTER TABLE "student_responses" ALTER COLUMN "violation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "events" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "event";--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "severity";--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "message";--> statement-breakpoint
ALTER TABLE "violations" DROP COLUMN "occurred_at";