import bcrypt from "bcryptjs";
import { redirect, type ActionFunction, type LoaderFunction } from "@remix-run/node";
import { getUserByEmail } from "./db.server"
import { sessionStorage, createUserSession } from "./session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const role = session.get("role");
  if (role === "teacher") return redirect("/teacher/dashboard");
  if (role === "student") return redirect("/student/dashboard");
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const email = String(form.get("email"));
  const password = String(form.get("password"));

  const user = await getUserByEmail(email);
  if (!user) return { error: "Invalid email or password" };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { error: "Invalid email or password" };

  const redirectTo = user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
  return await createUserSession(user.id, user.role, redirectTo);
};