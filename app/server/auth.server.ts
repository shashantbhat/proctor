import bcrypt from "bcryptjs";
import {
  redirect,
  json,
  type ActionFunction,
  type LoaderFunction,
} from "@remix-run/node";
import { getUserByEmail } from "./db.server";
import { sessionStorage, createUserSession } from "./session.server";

// 🔹 Loader: Redirect user if already logged in
export const loader: LoaderFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const role = session.get("role");
  const userId = session.get("userId");

  // Redirect based on stored session info
  if (role === "teacher" && userId) return redirect(`/ dash/${userId}`);
  if (role === "student" && userId) return redirect(`/student-dash/${userId}`);
  return null;
};

// 🔹 Action: Handle login authentication
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  // Validate form inputs
  if (typeof email !== "string" || typeof password !== "string") {
    return json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  // Get user by email
  const user = await getUserByEmail(email);
  if (!user) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Ensure password hash exists
  if (!user.passwordHash) {
    console.error("Missing passwordHash in user record:", user);
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Compare entered password with stored hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Determine redirect path with user UUID
  const redirectTo =
    user.role === "teacher"
      ? `/teacher-dash/${user.id}`
      : `/student-dash/${user.id}`;

  // Create user session and redirect
  return await createUserSession(user.id, user.role, redirectTo);
};