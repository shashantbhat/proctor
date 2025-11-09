import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------
// Users Table
// ---------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).default("student").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------
// Tests Table
// ---------------------
export const tests = pgTable("tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  durationMinutes: varchar("duration_minutes", { length: 10 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
});

// ---------------------
// Questions Table
// ---------------------
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id")
    .notNull()
    .references(() => tests.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>(), // ["A", "B", "C", "D"]
  imageUrls: jsonb("image_urls").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------
// Test Participants Table
// ---------------------
// → Stores which student was part of which test
export const testParticipants = pgTable("test_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id")
    .notNull()
    .references(() => tests.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 100 }).notNull(),
  enrollmentNo: varchar("enrollment_no", { length: 50 }).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  batch: varchar("batch", { length: 50 }).notNull(),
  branch: varchar("branch", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// ---------------------
// Student Responses Table
// ---------------------
// → Stores all answers submitted by a student for a specific test
export const studentResponses = pgTable("student_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id")
    .notNull()
    .references(() => tests.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // JSON object containing all answers for that test by this student
  answers: jsonb("answers").$type<
    {
      questionId: string;
      selectedOption?: string | null;
      writtenAnswer?: string | null;
    }[]
  >(),

  startedAt: timestamp("started_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});