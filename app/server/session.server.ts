import { createCookieSessionStorage, redirect } from "@remix-run/node";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET],
  },
});

// ✅ Create session after login
export async function createUserSession(userId: string, role: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  session.set("role", role);

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
      Location: redirectTo,
    },
  });
}

// ✅ Retrieve session info (for loaders, actions)
export async function getUserSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const role = session.get("role");

  if (!userId) return null; // no session
  return { id: userId, role }; // valid session
}

// ✅ Require session (forces login)
export async function requireUserSession(request: Request, redirectTo?: string) {
  const user = await getUserSession(request);
  if (!user) {
    throw redirect(`/sign-in${redirectTo ? `?redirectTo=${redirectTo}` : ""}`);
  }
  return user;
}

// ✅ Destroy session (for logout)
export async function destroyUserSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
      Location: "/get-started",
    },
  });
}