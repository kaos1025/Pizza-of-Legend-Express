import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /admin (admin panel, Korean only)
  // - /.*\\..*  (static files like favicon.ico)
  matcher: ['/((?!api|_next|admin|.*\\..*).*)'],
};
