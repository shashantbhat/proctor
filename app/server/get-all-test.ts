import {db} from "~/src/index"
import {tests} from "~/src/db/schema"

export async function getAllTests() {
  const result = await db.select().from(tests);
  return result; // returns array of tests
}