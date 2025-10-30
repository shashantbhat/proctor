import { db } from "../src/index";
import { tests } from "../src/db/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Types inferred from the schema
type Test = InferSelectModel<typeof tests>;
type NewTest = InferInsertModel<typeof tests>;

// Function definition
export async function createTest({
  title,
  description,
  teacherId,
}: {
  title: string;
  description: string;
  teacherId: string;
}): Promise<Test[]> {
  const result = await db
    .insert(tests)
    .values({
      title,
      description,
      teacherId,
    } satisfies NewTest)
    .returning(); // returns the inserted test row(s)

  return result;
}