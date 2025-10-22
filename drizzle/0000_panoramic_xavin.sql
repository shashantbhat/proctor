CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'student',
	"created_at" text DEFAULT 'now()',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
