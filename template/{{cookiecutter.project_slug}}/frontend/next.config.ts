{%- if cookiecutter.enable_marketing_site %}
import createMDX from "@next/mdx";
{%- endif %}
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");
{%- if cookiecutter.enable_marketing_site %}
const withMDX = createMDX({
  // No extra remark/rehype plugins for now — keep build simple.
  // next-mdx-remote/rsc handles the actual blog post compilation.
});
{%- endif %}

// Content Security Policy directives
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  connect-src 'self' ws: wss: http://localhost:* https://localhost:*;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\n/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
{%- if cookiecutter.enable_marketing_site %}
  pageExtensions: ["ts", "tsx", "mdx"],
{%- endif %}

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Relax framing for the file endpoint so the chat preview panel can
      // embed PDFs/HTML in an iframe from the same origin. Listed AFTER the
      // catch-all so its values win for matching headers.
      {
        source: "/api/files/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },

  // Environment variables available on the server side only
  serverRuntimeConfig: {
    apiUrl: process.env.BACKEND_URL || "http://localhost:{{ cookiecutter.backend_port }}",
  },

  // Environment variables available on both server and client
  publicRuntimeConfig: {
    appName: "{{ cookiecutter.project_name }}",
  },
};

{%- if cookiecutter.enable_marketing_site %}
export default withNextIntl(withMDX(nextConfig));
{%- else %}
export default withNextIntl(nextConfig);
{%- endif %}
