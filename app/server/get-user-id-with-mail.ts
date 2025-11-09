// app/utils/getUserId.server.ts
import { db } from "~/src/index";
import { users } from "~/src/db/schema";
import { eq } from "drizzle-orm";

export async function getUserIdByEmail(email: string) {
  const result = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return result[0]?.id || null;
}