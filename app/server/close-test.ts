import { db } from "../src/index";
import { tests } from "~/src/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

// Define the type representing a row from the `tests` table
type Test = InferSelectModel<typeof tests>;

export async function closeTest(testId: string): Promise<Test[]> {
  const result = await db
    .update(tests)
    .set({ isActive: false })
    .where(eq(tests.id, testId))
    .returning(); // returns the updated test row(s)
    
  return result;
}