import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// add public routes here
// const isPublicRoute = createRouteMatcher([
//   "/sign-in(.*)",
//   "/sign-up(.*)",
//   "/",
//   "/api/webhooks(.*)",
//   "/question/:id",
//   "/tags",
//   "/tags/:id",
//   "/profile/:id",
//   "/community",
//   "/jobs",
// ]);

// export default clerkMiddleware((auth, request) => {
//   if (!isPublicRoute(request)) auth().protect();
// });

const isProtectedRoute = createRouteMatcher(["/ask-question(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
