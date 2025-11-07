import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { json, redirect, type ActionFunction } from "@remix-run/node";
import { registerUser } from "~/server/db.server";
import { getUserIdByEmail } from "~/server/get-user-id-with-mail";
import { sessionStorage } from "~/server/session.server";
import { db } from "~/src/index";
import { users } from "~/src/db/schema";
import { eq } from "drizzle-orm";
import Iridescence from "~/components/Iridescence";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const mode = String(formData.get("mode"));

  // ============================
  // 🧠 SIGN IN LOGIC
  // ============================
  if (mode === "signin") {
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    if (!email || !password) {
      return json({ error: "Email and password required." });
    }

    // 1️⃣ Verify user credentials
    const user = await db.select().from(users).where(eq(users.email, email));
    if (!user[0] || user[0].password !== password) {
      return json({ error: "Invalid credentials." });
    }

    // 2️⃣ Get UUID of the user
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return json({ error: "User ID not found." });
    }

    // 3️⃣ Create session and store UUID
    const session = await sessionStorage.getSession();
    session.set("userId", userId);
    session.set("email", email);
    session.set("role", user[0].role);

    // 4️⃣ Redirect to dashboard based on role
    const redirectPath =
      user[0].role === "teacher"
        ? "/dash/university-admin"
        : "/dash/student";

    return redirect(redirectPath, {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  // ============================
  // 🧩 SIGN UP LOGIC
  // ============================
  const name = String(formData.get("name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const role = String(formData.get("role")) as "student" | "teacher";

  if (!name || !email || !password) {
    return json({ error: "All fields are required." });
  }

  try {
    await registerUser(name, email, password, role);
    return redirect("/sign-in");
  } catch (err) {
    console.error(err);
    return json({ error: "Registration failed. Try again." });
  }
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="w-screen h-screen relative">
      <div className="w-full h-full absolute inset-0">
        <Iridescence
          color={[0.5, 0.7, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md backdrop-blur-md bg-opacity-90">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6 gap-4">
            <button
              onClick={() => setMode("signin")}
              className={`px-4 py-2 font-medium rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`px-4 py-2 font-medium rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Role Selection for Sign Up */}
          {mode === "signup" && (
            <div className="flex justify-center mb-6 text-gray-700 text-sm">
              <span
                onClick={() => setRole("student")}
                className={`cursor-pointer font-medium mx-2 ${
                  role === "student" ? "text-black" : "text-gray-400"
                }`}
              >
                As a Student
              </span>
              <span
                onClick={() => setRole("teacher")}
                className={`cursor-pointer font-medium ${
                  role === "teacher" ? "text-black" : "text-gray-400"
                }`}
              >
                As a Teacher
              </span>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-6 text-center">
            {mode === "signin"
              ? "Sign In"
              : `Sign Up as ${role === "student" ? "Student" : "Teacher"}`}
          </h2>

          {/* Error Display */}
          {actionData?.error && (
            <div className="mb-4 text-red-500 text-sm text-center font-medium">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />
            {mode === "signup" && <input type="hidden" name="role" value={role} />}

            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  placeholder="Enter your full name"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 font-semibold text-white rounded-lg transition-all ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </button>
          </Form>

          <p className="text-sm text-center mt-4">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-black hover:underline font-medium"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-black hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}