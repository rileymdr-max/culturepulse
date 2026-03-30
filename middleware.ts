/**
 * Next.js middleware — protects all routes under /dashboard.
 * Unauthenticated requests are redirected to /login.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow the request through if the token check passed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/search", "/api/community/:path*", "/api/compare", "/api/trending", "/api/saved/:path*"],
};
