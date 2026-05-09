import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Don't prefix the default locale (e.g., /about instead of /en/about)
  localePrefix: "as-needed",

  // Always serve `defaultLocale` (en) at root, regardless of the visitor's
  // Accept-Language header. The user opts into Polish via the LanguageSwitcher.
  localeDetection: false,
});

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for:
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /static (inside /public)
    // - /_vercel (Vercel internals)
    // - All root files like favicon.ico, robots.txt, etc.
    "/((?!api|_next|_vercel|static|.*\\..*).*)",
  ],
};
