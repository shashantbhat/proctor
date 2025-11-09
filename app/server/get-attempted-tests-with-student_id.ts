import { db } from "~/src/index";
import { eq } from "drizzle-orm";
import { tests, testParticipants } from "~/src/db/schema";

export async function getAttemptedTestsByStudentId(studentId: string) {
  const result = await db
    .select({
      testId: tests.id,
      title: tests.title,
      description: tests.description,
      joinedAt: testParticipants.joinedAt,
    })
    .from(testParticipants)
    .innerJoin(tests, eq(testParticipants.testId, tests.id))
    .where(eq(testParticipants.studentId, studentId));

  return result;
}