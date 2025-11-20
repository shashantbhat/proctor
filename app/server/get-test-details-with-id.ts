import {db} from "~/src/index"
import { tests } from "~/src/db/schema"; 
import { eq } from "drizzle-orm";

export async function getTestDetailsById(testId: string) {
  try {
    const result = await db
      .select({
        id: tests.id,
        title: tests.title,
        description: tests.description,
        teacherId: tests.teacherId,
        durationMinutes: tests.durationMinutes,
        startTime: tests.startTime,
        endTime: tests.endTime,
        isActive: tests.isActive,
        createdAt: tests.createdAt,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    if (!result.length) {
      return { success: false, message: "Test not found" };
    }

    return { success: true, test: result[0] };

  } catch (err) {
    console.error("Error fetching test:", err);
    return { success: false, message: "DB error occurred" };
  }
}