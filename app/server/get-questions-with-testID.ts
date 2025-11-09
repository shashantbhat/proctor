import { db } from "~/src"; // your drizzle db instance
import { questions } from "~/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch all questions belonging to a specific test
 * @param testId - UUID of the test
 * @returns Array of questions with all details
 */
export async function getQuestionsByTestId(testId: string) {
  try {
    // Step 1: Get all questions for the given test
    const questionList = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        options: questions.options,
        imageUrls: questions.imageUrls,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .where(eq(questions.testId, testId));

    // Step 2: Optional — Extract only IDs if you want them separately
    const questionIds = questionList.map((q) => q.id);

    return {
      success: true,
      testId,
      questionIds,
      questions: questionList,
    };
  } catch (error) {
    console.error("❌ Error fetching questions for test:", error);
    return {
      success: false,
      error: "Failed to retrieve questions",
    };
  }
}