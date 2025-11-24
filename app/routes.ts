import { type RouteConfig, index } from "@react-router/dev/routes";

// export default [index("routes/home.tsx")] satisfies RouteConfig;

export default [
    {
        path: "/",
        file: "routes/home/route.tsx", // Home route
    },
    {
        path: "student-dash/:id",
        file: "routes/student-dash.$id/route.tsx",
    },
    {
        path: "teacher-dash/:id",
        file: "routes/teacher-dash.$id/route.tsx",
    },
    {
        path: "/exam",
        file: "routes/exam/route.tsx", // Exam route
    },
    // {
    //     path: "/face-detection",
    //     file: "components/face-detection", // Exam route
    // },
    {
        path: "/get-started",
        file: "routes/auth/route.tsx", // Exam route
    },
    {
        path:"teacher-dash/:id/new-test",
        file: "routes/teacher-dash.$id/new-test.tsx"
    },
    {
        path:"test/:test_id",
        file: "routes/teacher-dash.$id/test.$test_id.tsx"
    },
    {
        path: "start-test/:testId",
        file: "routes/start-test/start-test.$test_id.tsx",
    },
    {
        path: "start-test/:testId/details",
        file: "routes/start-test/start-test.$test_id.details.tsx",
    },
    {
        path: "test/:testId/start",
        file: "routes/start-test/start-test.$test_id.start.tsx",
    },
    {
        path: "/api/record-violations",
        file: "routes/api/record-violations.tsx",
    },
    {
        path: "/api/submit-test",
        file: "routes/api/submit-test.tsx",
    },
    {
        path: "/api/process-speech-analysis",
        file: "routes/api/process-speech-analysis.tsx",
    },
    {
        path: "/api/analyse-transcript",
        file: "routes/api/analyse-transcript.tsx",
    }
] satisfies RouteConfig;