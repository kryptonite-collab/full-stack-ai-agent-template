/** Inline JSON-LD `<script>` for schema.org structured data.
 *  Use under server components only — Next.js will inline this into the SSR HTML. */

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- safe: server-side stringify of static schema
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
