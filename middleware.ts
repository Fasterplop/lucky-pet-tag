import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Rutas globales que NO deben reescribirse
  const globalRoutes = ['/login', '/update-password'];

  const isGlobalRoute = globalRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Archivos públicos / assets que NO deben reescribirse
  const isPublicAsset =
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/logo.webp' ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml)$/i);

  if (isGlobalRoute || isPublicAsset) {
    return NextResponse.next();
  }

  if (hostname.startsWith('admin.')) {
    return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url));
  }

  if (hostname.startsWith('id.')) {
    return NextResponse.rewrite(new URL(`/id${pathname}`, request.url));
  }

  if (hostname.startsWith('app.')) {
    return NextResponse.rewrite(new URL(`/app${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};