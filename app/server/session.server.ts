import { createCookieSessionStorage } from "@remix-run/node";

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