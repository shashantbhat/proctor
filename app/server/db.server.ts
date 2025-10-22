import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/index";  // your drizzle config file
import { users } from "../src/db/schema";  // your drizzle schema

// -------------------------------
// Fetch user by email
// -------------------------------
export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] ?? null;
}

// -------------------------------
// Register new user (student or teacher)
// -------------------------------
export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: "student" | "teacher"
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    passwordHash: hashedPassword,
    role
  });
}