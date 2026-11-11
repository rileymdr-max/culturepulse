/**
 * Next.js middleware.
 *  - Protects /dashboard and selected API routes: unauthenticated requests are
 *    redirected to /login.
 *  - Keeps the one-click demo account read-only: the demo user may only call
 *    the allowlisted read routes in lib/demo-policy.ts.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isDemoApiAllowed, DEMO_BLOCKED_CODE } from "@/lib/demo-policy";

const PROTECTED = [
  /^\/dashboard(\/|$)/,
  /^\/api\/search$/,
  /^\/api\/community(\/|$)/,
  /^\/api\/compare$/,
  /^\/api\/trending$/,
  /^\/api\/saved(\/|$)/,
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    if (req.nextauth.token?.demo && pathname.startsWith("/api/") && !isDemoApiAllowed(req.method, pathname)) {
      return NextResponse.json(
        {
          error: "This is a read-only demo. Book a demo or create a free account to run this.",
          code: DEMO_BLOCKED_CODE,
        },
        { status: 403 }
      );
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) =>
        !!token || !PROTECTED.some((re) => re.test(req.nextUrl.pathname)),
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
