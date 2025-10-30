import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ---------------------
// Users Table (Already exists)
// ---------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).default("student"),
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
  options: jsonb("options").$type<string[]>(), // ["Option A", "Option B", "Option C", ...]
  imageUrls: jsonb("image_urls").$type<string[]>(), // ["url1", "url2"]
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------
// Student Responses Table
// ---------------------
export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id")
    .notNull()
    .references(() => tests.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<
    {
      questionId: string;
      selectedOption: string | null;
      writtenAnswer?: string;
    }[]
  >(),
  submittedAt: timestamp("submitted_at").defaultNow()
});