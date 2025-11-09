import { Form, useActionData } from "react-router";
import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/src/index";
import { users } from "~/src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createUserSession } from "~/server/session.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const { testId } = params;

  // Validate input
  if (!email || !password) {
    return json({ error: "Please fill all fields." }, { status: 400 });
  }

  // Find user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser.length === 0) {
    return json({ error: "No student found with this email." }, { status: 404 });
  }

  const user = existingUser[0];
  if (user.role !== "student") {
    return json({ error: "Only students can access this test." }, { status: 403 });
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return json({ error: "Incorrect password." }, { status: 401 });
  }

  // ✅ Auth successful → create session → redirect to details form
  return await createUserSession(user.id, user.role, `/start-test/${testId}/details`);
};

export default function StudentAuth() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Student Authentication
        </h1>

        {actionData?.error && (
          <p className="text-red-600 mb-4 text-center">{actionData.error}</p>
        )}

        <Form method="post" className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Student Email"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded py-2 hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </Form>
      </div>
    </div>
  );
}