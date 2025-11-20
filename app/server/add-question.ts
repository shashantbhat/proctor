import { db } from "../src/index";
import { questions } from "~/src/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type NewQuestion = InferInsertModel<typeof questions>;

export async function addQuestion({
  testId,
  questionText,
  options,
}: {
  testId: string;
  questionText: string;
  options: string[];
}): Promise<NewQuestion[]> {
  const result = await db
    .insert(questions)
    .values({
      testId,
      questionText,
      options,
    })
    .returning();

  return result;
}