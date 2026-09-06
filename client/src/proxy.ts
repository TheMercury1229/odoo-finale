import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/signin", "/signup", "/forgot-password"];

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

type SessionState = {
  isAuthenticated: boolean;
  role?: string | null;
};

async function getSessionState(request: NextRequest): Promise<SessionState> {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) return { isAuthenticated: false };

  const authUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  try {
    const response = await fetch(`${authUrl}/api/auth/get-session`, {
      headers: { cookie: `${sessionCookie.name}=${sessionCookie.value}` },
      cache: "no-store",
    });

    if (!response.ok) return { isAuthenticated: false };

    const payload = await response.json();
    if (!payload?.user) return { isAuthenticated: false };

    return {
      isAuthenticated: true,
      role: payload.user.role,
    };
  } catch {
    return { isAuthenticated: false };
  }
}

function getHomeRoute(role?: string | null) {
  return role === "contact" ? "/portal/invoices" : "/contacts";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAcceptInviteRoute =
    pathname === "/accept-invite" || pathname.startsWith("/accept-invite/");
  const isPublic = isPublicRoute(pathname) || isAcceptInviteRoute;
  const session = await getSessionState(request);

  if (isPublic && session.isAuthenticated && !isAcceptInviteRoute) {
    return NextResponse.redirect(
      new URL(getHomeRoute(session.role), request.url),
    );
  }

  if (!isPublic && !session.isAuthenticated) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (session.isAuthenticated && pathname === "/") {
    return NextResponse.redirect(
      new URL(getHomeRoute(session.role), request.url),
    );
  }

  const isProfileRoute = pathname === "/profile" || pathname.startsWith("/profile/");

  if (
    session.isAuthenticated &&
    session.role === "contact" &&
    !pathname.startsWith("/portal") &&
    !isProfileRoute &&
    !isAcceptInviteRoute
  ) {
    return NextResponse.redirect(new URL("/portal/invoices", request.url));
  }

  if (
    session.isAuthenticated &&
    session.role !== "contact" &&
    pathname.startsWith("/portal")
  ) {
    return NextResponse.redirect(new URL("/contacts", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/uploadthing|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
