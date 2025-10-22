import { useState } from "react";
import { Form, useActionData } from "react-router";
import { json, redirect, type ActionFunction } from "@remix-run/node";
import { registerUser } from "~/server/db.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = String(formData.get("name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const role = String(formData.get("role")) as "student" | "teacher";

  if (!name || !email || !password)
    return json({ error: "All fields are required." });

  try {
    await registerUser(name, email, password, role);
    return redirect("/signin");
  } catch (err) {
    console.error(err);
    return json({ error: "Registration failed. Try again." });
  }
};

export default function SignupPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md">
        {/* Role Switch Text */}
        <div className="flex justify-center mb-6 text-gray-700 text-sm">
          <span
            onClick={() => setRole("student")}
            className={`cursor-pointer font-medium ${
              role === "student" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            As a Student
          </span>
          <span className="mx-2">/</span>
          <span
            onClick={() => setRole("teacher")}
            className={`cursor-pointer font-medium ${
              role === "teacher" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            As a Teacher
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-4">
          Sign Up {role === "student" ? "as Student" : "as Teacher"}
        </h1>

        {actionData?.error && (
          <p className="text-red-600 mb-4 text-center">{actionData.error}</p>
        )}

        <Form method="post" className="space-y-4">
          <input type="hidden" name="role" value={role} />

          <div>
            <label className="block text-sm mb-1">Full Name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="John Doe"
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full border rounded p-2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition"
          >
            Create Account
          </button>
        </Form>

        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <a href="/signin" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}