import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/kader(.*)",
  "/mitglieder(.*)",
  "/kalender(.*)",
  "/saisons(.*)",
  "/training(.*)",
  "/spiele(.*)",
  "/statistiken(.*)",
  "/abwesenheiten(.*)",
  "/einladungen(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/",
    "/invite(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/dashboard(.*)",
    "/onboarding(.*)",
    "/kader(.*)",
    "/mitglieder(.*)",
    "/kalender(.*)",
    "/saisons(.*)",
    "/training(.*)",
    "/spiele(.*)",
    "/statistiken(.*)",
    "/abwesenheiten(.*)",
    "/einladungen(.*)",
    "/(api|trpc)(.*)",
  ],
};
