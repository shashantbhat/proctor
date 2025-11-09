import { Link, useLoaderData, Form, useNavigate } from "react-router";
import {
  json,
  redirect,
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/node";
import { db } from "~/src/index";
import { tests } from "~/src/db/schema";
import { eq, and } from "drizzle-orm";
import { closeTest } from "~/server/close-test";
import { sessionStorage } from "~/server/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  // ✅ Get session
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) throw new Response("Unauthorized", { status: 401 });
  // ✅ Build base URL for shareable links
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // ✅ Fetch teacher's active tests using session userId
  const activeTests = await db
    .select()
    .from(tests)
    .where(and(eq(tests.teacherId, userId), eq(tests.isActive, true)));

  return json({ activeTests, baseUrl, userId });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));


  // ✅ Handle logout
  if (intent === "logout") {
    return redirect("/get-started", {
      headers: {
        "Set-Cookie": await sessionStorage.destroySession(session),
      },
    });
  }

  // ✅ Handle test close
  if (intent === "closeTest") {
    const testId = formData.get("testId") as string;
    await closeTest(testId);
  }

  return null;
};

export default function TeacherDashboard() {
  const { activeTests, baseUrl, userId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleNewTestClick = () => navigate(`/teacher-dash/${userId}/new-test`);

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    } catch {
      alert("Failed to copy link.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      {/* Header with logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </Form>
      </div>

      {/* Create new test */}
      <div className="mb-6">
        <button
          onClick={handleNewTestClick}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create New Test
        </button>
      </div>

      {/* Active tests */}
      <h2 className="text-xl font-semibold mb-4">Active Tests</h2>
      {activeTests.length === 0 ? (
        <p>No active tests found.</p>
      ) : (
        <div className="space-y-4">
          {activeTests.map((test) => {
            const shareableLink = `${baseUrl}/start-test/${test.id}`;
            return (
              <div
                key={test.id}
                className="p-4 border rounded-lg flex flex-col gap-3 md:flex-row md:justify-between md:items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">{test.title}</h3>
                  <p className="text-sm text-gray-600">{test.description}</p>
                  <p className="text-xs text-gray-400">Test ID: {test.id}</p>

                  <div className="mt-2 bg-gray-100 px-3 py-2 rounded flex items-center gap-2">
                    <code className="text-sm text-blue-600 flex-1 overflow-x-auto">
                      {shareableLink}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(shareableLink)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    to={`/test/${test.id}`}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    View / Add Questions
                  </Link>

                  <Form method="post">
                    <input type="hidden" name="intent" value="closeTest" />
                    <input type="hidden" name="testId" value={test.id} />
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Close Test
                    </button>
                  </Form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}