import { useState } from "react";
import { Link, useLoaderData, Form, useNavigate, type MetaFunction } from "react-router";
import {
  json,
  redirect,
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/node";
import { db } from "~/src/index";
import { tests, testParticipants, studentResponses, questions } from "~/src/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { closeTest } from "~/server/close-test";
import { sessionStorage } from "~/server/session.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Teacher Dashboard" }   // <-- Your page title
  ];
};

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

  // ✅ Fetch analytics for each test
  const testsWithAnalytics = await Promise.all(
    activeTests.map(async (test) => {
      // Get participant count
      const participantCount = await db
        .select({ count: count() })
        .from(testParticipants)
        .where(eq(testParticipants.testId, test.id));

      // Get submission count
      const submissionCount = await db
        .select({ count: count() })
        .from(studentResponses)
        .where(
          and(
            eq(studentResponses.testId, test.id),
            sql`${studentResponses.submittedAt} IS NOT NULL`
          )
        );

      // Get question count
      const questionCount = await db
        .select({ count: count() })
        .from(questions)
        .where(eq(questions.testId, test.id));

      return {
        ...test,
        analytics: {
          participants: participantCount[0]?.count || 0,
          submissions: submissionCount[0]?.count || 0,
          questions: questionCount[0]?.count || 0,
        },
      };
    })
  );

  // ✅ Calculate overall statistics
  const totalParticipants = testsWithAnalytics.reduce(
    (sum, test) => sum + Number(test.analytics.participants),
    0
  );
  const totalSubmissions = testsWithAnalytics.reduce(
    (sum, test) => sum + Number(test.analytics.submissions),
    0
  );

  return json({
    activeTests: testsWithAnalytics,
    baseUrl,
    userId,
    overallStats: {
      totalTests: activeTests.length,
      totalParticipants,
      totalSubmissions,
    },
  });
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
  const { activeTests, baseUrl, userId, overallStats } = useLoaderData<typeof loader>();
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
    <section className="text-white/85 bg-gradient-to-b from-[#142E29] to-[#031B1D] min-h-screen fixed inset-0 overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with logout */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <Form method="post">
            <input type="hidden" name="intent" value="logout" />
            <button
              type="submit"
              className="px-4 py-2 rounded-[10px] transition bg-gradient-to-r from-emerald-700 to-emerald-500 text-white/85"
            >
              Logout
            </button>
          </Form>
        </div>
        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Active Tests */}
          <div className="relative">
            <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-6 relative z-10 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Active Tests</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    {overallStats.totalTests}
                  </p>
                </div>
                <div className="p-3 rounded-full">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Total Participants */}
            <div className="relative">      
            <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-6 relative z-10 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Total Participants</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    {overallStats.totalParticipants}
                  </p>
                </div>
                <div className="p-3 rounded-full">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 - Total Submissions */}
          <div className="relative">
            <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-6 relative z-10 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    {overallStats.totalSubmissions}
                  </p>
                </div>
                <div className="p-3 rounded-full">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create new test */}
        <div className="mb-6">
          <button
            onClick={handleNewTestClick}
            className="bg-gradient-to-r text-sm items-center from-emerald-700 to-emerald-500 text-white/85 px-6 py-3 rounded-xl transition font-medium shadow-md"
          >
            Create New Test
          </button>
        </div>

        {/* Active tests with analytics */}
        <h2 className="text-2xl font-semibold mb-4">Active Tests</h2>
        {activeTests.length === 0 ? (
          <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-8 text-center">
            <p className="text-emerald-400">No active tests found. Create your first test to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTests.map((test) => {
              const shareableLink = `${baseUrl}/start-test/${test.id}`;
              const completionRate = test.analytics.participants > 0
                ? Math.round((Number(test.analytics.submissions) / Number(test.analytics.participants)) * 100)
                : 0;

              return (
                <div
                  key={test.id}
                  className="bg-[#0C1219]/85 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  {/* Test Header */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl text-emerald-400">{test.title}</h3>
                        <p className="text-sm text-white/85 mt-1">{test.description}</p>
                        {/* <p className="text-xs text-gray-400 mt-2">Test ID: {test.id}</p> */}
                      </div>

                      {/* Quick Stats */}
                      <div className="flex gap-4 lg:gap-6 text-white/85">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{test.analytics.questions}</p>
                          <p className="text-xs">Questions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{test.analytics.participants}</p>
                          <p className="text-xs">Participants</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{test.analytics.submissions}</p>
                          <p className="text-xs">Submissions</p>
                        </div>
                      </div>
                    </div>

                    {/* Completion Rate Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/85">Completion Rate</span>
                        <span className="font-medium text-white/85">{completionRate}%</span>
                      </div>
                      <div className="w-ful rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shareable Link */}
                  <div className="px-6 py-2">
                    <p className="text-xs text-white/85 mb-2 font-medium">Shareable Link</p>
                    <div className="flex items-center gap-2">
                      <div className="bg-white/2.5 px-3 py-2 rounded-lg flex w-full justify-between items-center">
                        <code className="text-sm text-emerald-300 flex-1 overflow-x-auto">
                          {shareableLink}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(shareableLink)}
                          className="text-xs items-center text-white/85 border border-emerald-400 px-3 py-1.5 rounded-lg transition whitespace-nowrap hover:bg-emerald-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 flex flex-wrap gap-3">
                    <Link
                      to={`/test/${test.id}`}
                      className="bg-gradient-to-r text-sm items-center from-emerald-800 to-emerald-600 text-white px-4 py-2 rounded-lg transition font-medium"
                    >
                      View / Add Questions
                    </Link>

                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="closeTest" />
                      <input type="hidden" name="testId" value={test.id} />
                      <button
                        type="submit"
                        className="border border-emerald-400 text-white px-4 py-2 rounded-lg transition font-medium text-sm items-center hover:bg-emerald-700"
                        onClick={(e) => {
                          if (!confirm("Are you sure you want to close this test? This action cannot be undone.")) {
                            e.preventDefault();
                          }
                        }}
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
    </section>
  );
}