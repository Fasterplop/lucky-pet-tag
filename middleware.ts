import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Rutas globales que NO deben reescribirse por subdominio
  const globalRoutes = ['/login', '/update-password'];

  const isGlobalRoute = globalRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isGlobalRoute) {
    return NextResponse.next();
  }

  // admin.luckypetag.com -> /admin/*
  if (hostname.startsWith('admin.')) {
    return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url));
  }

  // id.luckypetag.com -> /id/*
  if (hostname.startsWith('id.')) {
    return NextResponse.rewrite(new URL(`/id${pathname}`, request.url));
  }

  // app.luckypetag.com -> /app/*
  if (hostname.startsWith('app.')) {
    return NextResponse.rewrite(new URL(`/app${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};