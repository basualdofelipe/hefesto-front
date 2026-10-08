import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import type { Permissions } from '@/types/permissions';

const ROUTE_PERMISSIONS: Record<string, keyof Permissions> = {
  '/catalogos': 'canViewProducts',
  '/proveedores': 'canViewSupplies',
  '/insumos': 'canViewSupplies',
  '/productos': 'canViewProducts',
  '/finanzas': 'canViewExpenses',
  '/usuarios': 'canManageUsers',
  '/configuracion': 'canManageConfig',
  '/calculadora': 'canUseCalculator',
  '/escenarios': 'canManageScenarios',
  '/roles': 'canManageUsers',
};

function getRequiredPermission(pathname: string): keyof Permissions | null {
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return permission;
    }
  }
  return null;
}

export const middleware = auth((req) => {
  const { pathname } = req.nextUrl;

  // Unauthenticated users: redirect to /login (except public pages)
  if (!req.auth && pathname !== '/login' && pathname !== '/acceso-denegado') {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }

  // Authenticated but backend rejected (no backendToken): redirect to /acceso-denegado
  if (
    req.auth &&
    !req.auth.accessToken &&
    pathname !== '/acceso-denegado' &&
    pathname !== '/login'
  ) {
    return Response.redirect(new URL('/acceso-denegado', req.nextUrl.origin));
  }

  // Permission-based routing: check required permission for each route
  const requiredPermission = getRequiredPermission(pathname);
  if (requiredPermission && req.auth) {
    const permissions = req.auth.user?.permissions;

    // Development verification (catch serialization issues early)
    if (
      process.env.NODE_ENV === 'development' &&
      req.auth.user &&
      !permissions
    ) {
      logger.warn(
        { op: 'route-permissions', requiredPermission },
        'user authenticated but permissions undefined; check the auth.ts JWT/session callbacks',
      );
    }

    if (!permissions || !permissions[requiredPermission]) {
      return Response.redirect(new URL('/', req.nextUrl.origin));
    }
  }
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|fonts|images|brand).*)',
  ],
};
