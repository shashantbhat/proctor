import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { json, redirect, type ActionFunction } from "@remix-run/node";
import { registerUser } from "~/server/db.server";
import { action as authAction } from "~/server/auth.server";
import Iridescence from "~/components/Iridescence";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const mode = String(formData.get("mode"));

  // Handle Sign In
  if (mode === "signin") {
    // Create a new request with the formData for authAction
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: new URLSearchParams(formData as any),
    });
    return authAction({ request: newRequest });
  }

  // Handle Sign Up
  const name = String(formData.get("name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const role = String(formData.get("role")) as "student" | "teacher";

  if (!name || !email || !password)
    return json({ error: "All fields are required." });

  // Server-side validation
  if (name.trim().length < 2) {
    return json({ error: "Name must be at least 2 characters long." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json({ error: "Please enter a valid email address." });
  }

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters long." });
  }

  if (!/[A-Z]/.test(password)) {
    return json({ error: "Password must contain at least one uppercase letter." });
  }

  if (!/[a-z]/.test(password)) {
    return json({ error: "Password must contain at least one lowercase letter." });
  }

  if (!/[0-9]/.test(password)) {
    return json({ error: "Password must contain at least one number." });
  }

  try {
    await registerUser(name, email, password, role);
    return redirect("/get-started");
    } catch (err: any) {
    console.error("REG ERROR:", err);

    const pgCode =
      err?.code ||
      err?.original?.code ||
      err?.cause?.code ||
      err?.parent?.code;

    // Unique constraint violation
    if (pgCode === "23505") {
      return json({
        error: "This email is already registered with us."
      });
    }

    return json({ error: "Registration failed. Try again." });
  }
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const validateName = (name: string) => {
    if (name.trim().length < 2) {
      return "Name must be at least 2 characters long";
    }
    return "";
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const handleBlur = (field: string, value: string) => {
    if (mode !== "signup") return;

    let error = "";
    if (field === "name") {
      error = validateName(value);
    } else if (field === "email") {
      error = validateEmail(value);
    } else if (field === "password") {
      error = validatePassword(value);
    }

    setValidationErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  return (
    <div className="w-screen h-screen relative">
      {/* Background */}
      <div className="w-full h-full absolute inset-0">
        <Iridescence
          color={[0.5, 0.7, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      {/* Form Container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md backdrop-blur-md bg-opacity-90">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6 gap-4">
            <button
              onClick={() => {
                setMode("signin");
                setValidationErrors({});
              }}
              className={`px-4 py-2 font-medium rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setValidationErrors({});
              }}
              className={`px-4 py-2 font-medium rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign Up - Role Switch */}
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

          <Form method="post" className="flex flex-col gap-4" key={mode}>
            <input type="hidden" name="mode" value={mode} />
            {mode === "signup" && <input type="hidden" name="role" value={role} />}

            {/* Name field (only for signup) */}
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
                  onBlur={(e) => handleBlur("name", e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
            )}

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
                onBlur={(e) => mode === "signup" && handleBlur("email", e.target.value)}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
              )}
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
                onBlur={(e) => mode === "signup" && handleBlur("password", e.target.value)}
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.password ? "border-red-500" : "border-gray-300"
                }`}
              />
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
              )}
              {mode === "signup" && !validationErrors.password && (
                <p className="text-gray-500 text-xs mt-1">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {/* Submit Button */}
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

          {/* Toggle Text */}
          <p className="text-sm text-center mt-4">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setValidationErrors({});
                  }}
                  className="text-black hover:underline font-medium"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signin");
                    setValidationErrors({});
                  }}
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