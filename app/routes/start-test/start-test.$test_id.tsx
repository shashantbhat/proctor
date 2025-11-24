import { Form, useActionData } from "react-router";
import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/src/index";
import { users, testParticipants } from "~/src/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createUserSession } from "~/server/session.server";
import { useState } from "react";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const { testId } = params;

  if (!email || !password) {
    return json({ error: "Please fill all fields." }, { status: 400 });
  }

  // ✔️ Find user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser.length === 0) {
    return json({ error: "No student found with this email." }, { status: 404 });
  }

  const user = existingUser[0];

  // ✔️ Ensure the user is a student
  if (user.role !== "student") {
    return json({ error: "Only students can access this test." }, { status: 403 });
  }

  // ✔️ Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return json({ error: "Incorrect password." }, { status: 401 });
  }

  // 🔥 ✔️ Check if student already attempted this test
  const existingAttempt = await db
    .select()
    .from(testParticipants)
    .where(
      and(
        eq(testParticipants.testId, testId!),
        eq(testParticipants.studentId, user.id)
      )
    );

  if (existingAttempt.length > 0) {
    return json(
      {
        error:
          "You have already attempted this test. Each student can only attempt once.",
      },
      { status: 409 }
    );
  }

  // 🚀 Create session and redirect
  return await createUserSession(
    user.id,
    user.role,
    `/start-test/${testId}/details`
  );
};

export default function StudentAuth() {
  const actionData = useActionData<typeof action>();
  const [isFormActive, setIsFormActive] = useState(false);

  return (
    <div className="w-screen h-screen relative bg-gradient-to-b from-[#142E29] to-[#031B1D]">
      {/* Form Container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">

        {/* Gradient Background (shows on hover or focus inside form) */}
        <img
          src="https://qblapbmmhjyxpoeyhjrf.supabase.co/storage/v1/object/public/question-images/assets/bg-grad-get-started.png"
          className={`
            w-full h-full object-contain absolute inset-0
            transition-opacity duration-500 
            pointer-events-none
            ${isFormActive ? 'opacity-100' : 'opacity-0'}
          `}
        />
        <div 
          className="bg-white/85 shadow-md rounded-2xl p-8 w-full max-w-md backdrop-blur-md bg-opacity-90 relative z-10"
          onMouseEnter={() => setIsFormActive(true)}
          onMouseLeave={() => setIsFormActive(false)}
          // onFocus={() => setIsFormActive(true)}
          // onBlur={(e) => {
          //   // Only hide if focus is leaving the form container entirely
          //   if (!e.currentTarget.contains(e.relatedTarget)) {
          //     setIsFormActive(false);
          //   }
          // }}
        >
          <h1 className="text-2xl font-bold mb-6 text-center">
            Student Authentication
          </h1>

          {/* Error Display */}
          {actionData?.error && (
            <div className="mb-4 text-red-500 text-sm text-center font-medium">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="flex flex-col gap-4">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                placeholder="Enter your email"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                required
                placeholder="••••••••"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2 font-semibold text-white rounded-lg transition-all bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 hover:shadow-lg"
            >
              Continue
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}