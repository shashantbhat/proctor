import { type RouteConfig, index } from "@react-router/dev/routes";

// export default [index("routes/home.tsx")] satisfies RouteConfig;

export default [
    {
        path: "/",
        file: "routes/home/route.tsx", // Home route
    },
    {
        path: ":id",
        file: "routes/_student-dash.$id/route.tsx",
    },
    {
        path: "/U/:id",
        file: "routes/_teacher-dash.$id/route.tsx",
    },
    {
        path: "/exam",
        file: "routes/exam/route.tsx", // Exam route
    },
    {
        path: "/face-detection",
        file: "routes/face-detection/route.tsx", // Exam route
    },
    {
        path: "/sign-up",
        file: "routes/_auth.sign-up/route.tsx", // Exam route
    },
] satisfies RouteConfig;