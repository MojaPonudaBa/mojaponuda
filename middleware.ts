import { NextResponse, type NextRequest } from 'next/server'

// Lightweight middleware: no external dependencies.
// Checks Supabase auth cookie presence for route protection.
// Actual session validation happens server-side in page components.

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublicRoute =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/api/') ||
    path.startsWith('/privacy') ||
    path.startsWith('/terms')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookies (sb-<project>-auth-token)
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
