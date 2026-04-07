import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtenemos la ruta que el usuario está buscando (ej. /x7k9)
  const url = request.nextUrl;

  // Obtenemos el dominio desde donde entra (ej. admin.luckypetag.com o localhost:3000)
  const hostname = request.headers.get('host') || '';

  // 1. Si entra por admin.luckypetag.com -> Lo mandamos a la carpeta oculta /admin
  if (hostname.startsWith('admin.')) {
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, request.url));
  }

  // 2. Si entra por id.luckypetag.com -> Lo mandamos a la carpeta oculta /id
  if (hostname.startsWith('id.')) {
    return NextResponse.rewrite(new URL(`/id${url.pathname}`, request.url));
  }

  // 3. Si entra por app.luckypetag.com -> Lo mandamos a la carpeta oculta /app
  if (hostname.startsWith('app.')) {
    return NextResponse.rewrite(new URL(`/app${url.pathname}`, request.url));
  }

  // Si entra por el dominio principal normal, dejamos que siga su camino
  return NextResponse.next();
}

// Esto le dice al guardia que ignore las imágenes y archivos de sistema para no poner lenta la página
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};