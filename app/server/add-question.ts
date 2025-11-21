import { db } from "../src/index";
import { questions } from "~/src/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type NewQuestion = InferInsertModel<typeof questions>;

export async function addQuestion({
  testId,
  questionText,
  options,
  imageUrl,
}: {
  testId: string;
  questionText: string;
  options: string[];
  imageUrl?: string | null;
}) {
  await db.insert(questions).values({
    testId,
    questionText,
    options,
    imageUrl,
  });
}