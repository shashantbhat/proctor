import { type LoaderFunction, type ActionFunction, json, redirect } from "@remix-run/node";
import { sessionStorage } from "~/server/session.server";
import { getUserById } from "~/server/db.server";
import { getAllTests } from "~/server/get-all-test";
import { getAttemptedTestsByStudentId } from "~/server/get-attempted-tests-with-student_id";
import { Link, useLoaderData, Form } from "react-router";
import { db } from "~/src/index";
import { studentResponses, questions } from "~/src/db/schema";
import { eq, and, sql } from "drizzle-orm";

// 🧠 Loader to fetch student info + tests with analytics
export const loader: LoaderFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) throw new Response("Unauthorized", { status: 401 });

  const [user, attemptedTests, availableTests] = await Promise.all([
    getUserById(userId),
    getAttemptedTestsByStudentId(userId),
    getAllTests(),
  ]);

  // ✅ Calculate analytics for attempted tests
  const attemptedTestsWithAnalytics = await Promise.all(
    attemptedTests.map(async (test: any) => {
      // Get student's response for this test
      const response = await db
        .select()
        .from(studentResponses)
        .where(
          and(
            eq(studentResponses.testId, test.testId),
            eq(studentResponses.studentId, userId)
          )
        )
        .limit(1);

      // Get total questions for this test
      const totalQuestions = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(eq(questions.testId, test.testId));

      const questionsCount = Number(totalQuestions[0]?.count || 0);
      const isSubmitted = response[0]?.submittedAt != null;
      const answeredCount = response[0]?.answers?.length || 0;

      return {
        ...test,
        analytics: {
          totalQuestions: questionsCount,
          answeredQuestions: answeredCount,
          isSubmitted,
          submittedAt: response[0]?.submittedAt,
          completionPercentage: questionsCount > 0 
            ? Math.round((answeredCount / questionsCount) * 100) 
            : 0,
        },
      };
    })
  );

  // ✅ Calculate overall student statistics
  const totalTestsAttempted = attemptedTests.length;
  const totalTestsCompleted = attemptedTestsWithAnalytics.filter(
    (t) => t.analytics.isSubmitted
  ).length;
  const totalTestsInProgress = totalTestsAttempted - totalTestsCompleted;

  return json({
    user,
    attemptedTests: attemptedTestsWithAnalytics,
    availableTests,
    overallStats: {
      totalAvailable: availableTests.length,
      totalAttempted: totalTestsAttempted,
      totalCompleted: totalTestsCompleted,
      totalInProgress: totalTestsInProgress,
    },
  });
};

// 🚪 Action to handle logout (destroy session)
export const action: ActionFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/get-started", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

// 🧩 Component
export default function StudentDashboard() {
  const { user, availableTests, attemptedTests, overallStats } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {user?.name || "Student"} 👋
          </h1>
          <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
        </div>

        {/* 🚪 Logout Button */}
        <Form method="post">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Logout
          </button>
        </Form>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Available Tests</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {overallStats.totalAvailable}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">
                {overallStats.totalInProgress}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div> */}

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {overallStats.totalCompleted}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Attempted</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {overallStats.totalAttempted}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* --- Available Tests --- */}
      {/* <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Available Tests</h2>
        {availableTests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTests.map((test: any) => (
              <div
                key={test.id}
                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{test.title}</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{test.description}</p>
                
                {test.durationMinutes && (
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Duration: {test.durationMinutes} minutes
                  </div>
                )}

                <Link
                  to={`/start-test/${test.id}`}
                  className="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Start Test
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">No tests available right now.</p>
            <p className="text-sm text-gray-500 mt-1">Check back later for new tests.</p>
          </div>
        )}
      </section> */}

      {/* --- Attempted Tests with Analytics --- */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">My Tests</h2>
        {attemptedTests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attemptedTests.map((test: any) => {
              const { analytics } = test;
              const statusColor = analytics.isSubmitted ? 'green' : 'yellow';
              const statusBg = analytics.isSubmitted ? 'bg-green-100' : 'bg-yellow-100';
              const statusText = analytics.isSubmitted ? 'text-green-700' : 'text-yellow-700';
              const statusLabel = analytics.isSubmitted ? 'Completed' : 'In Progress';

              return (
                <div
                  key={test.testId}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-200 overflow-hidden"
                >
                  {/* Header with Status Badge */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 pr-2">{test.title}</h3>
                      <span className={`${statusBg} ${statusText} text-xs font-medium px-2 py-1 rounded whitespace-nowrap`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{test.description}</p>

                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Questions attempted</p>
                        <p className="text-lg font-bold text-gray-900">
                          {analytics.answeredQuestions}/{analytics.totalQuestions}
                        </p>
                      </div>
                      {/* <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Progress</p>
                        <p className="text-lg font-bold text-gray-900">
                          {analytics.completionPercentage}%
                        </p>
                      </div> */}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            analytics.isSubmitted 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          }`}
                          style={{ width: `${analytics.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {analytics.isSubmitted && analytics.submittedAt ? (
                        <span>Submitted: {new Date(analytics.submittedAt).toLocaleDateString()}</span>
                      ) : (
                        <span>Started: {new Date(test.joinedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!analytics.isSubmitted && (
                    <div className="px-6 pb-6">
                      <Link
                        to={`/start-test/${test.testId}`}
                        className="block text-center bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition font-medium"
                      >
                        Continue Test
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-600">You haven't attempted any tests yet.</p>
            <p className="text-sm text-gray-500 mt-1">Start a test from the available tests above!</p>
          </div>
        )}
      </section>
    </div>
  );
}