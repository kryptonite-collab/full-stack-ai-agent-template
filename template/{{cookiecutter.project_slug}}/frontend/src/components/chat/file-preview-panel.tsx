{% raw %}"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { useFilePreviewStore } from "@/stores";
import { getFileUrl } from "@/lib/file-api";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";

/**
 * Right-hand sidebar that previews the file currently selected in the chat.
 * Switches viewer based on MIME type / extension.
 */
export function FilePreviewPanel() {
  const file = useFilePreviewStore((s) => s.file);
  const close = useFilePreviewStore((s) => s.close);

  if (!file) return null;

  const url = getFileUrl(file.id);
  const ext = extOf(file.filename);
  const kind = previewKind(file.mime_type, ext);

  return (
    <aside
      className="border-foreground/10 bg-card flex w-full max-w-full shrink-0 flex-col border-l md:w-[420px] lg:w-[520px]"
      aria-label="File preview"
    >
      {/* Header */}
      <header className="border-foreground/10 flex items-center gap-2 border-b px-3 py-2">
        <span className="bg-foreground/8 text-foreground/65 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <FileText className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium" title={file.filename}>
            {file.filename}
          </p>
          <p className="text-foreground/50 truncate font-mono text-[10px] tracking-wider uppercase">
            {ext ?? file.mime_type ?? "file"}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground/55 hover:bg-foreground/5 hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={url}
          download={file.filename}
          className="text-foreground/55 hover:bg-foreground/5 hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={close}
          className="text-foreground/55 hover:bg-foreground/5 hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          aria-label="Close preview"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Viewer */}
      <div className="min-h-0 flex-1 overflow-auto">
        <Viewer kind={kind} url={url} filename={file.filename} />
      </div>
    </aside>
  );
}

// ─── Type detection ────────────────────────────────────────────────────────

type PreviewKind = "image" | "pdf" | "csv" | "html" | "json" | "markdown" | "text" | "binary";

function extOf(filename: string): string | null {
  if (!filename.includes(".")) return null;
  const e = filename.split(".").pop();
  return e ? e.toLowerCase() : null;
}

function previewKind(mime: string | undefined, ext: string | null): PreviewKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext ?? "")) {
    return "image";
  }
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m === "text/csv" || ext === "csv" || ext === "tsv") return "csv";
  if (m === "text/html" || ext === "html" || ext === "htm") return "html";
  if (m === "application/json" || ext === "json") return "json";
  if (m === "text/markdown" || ext === "md" || ext === "markdown") return "markdown";
  if (
    m.startsWith("text/") ||
    ["txt", "log", "py", "ts", "tsx", "js", "jsx", "yaml", "yml", "toml", "ini", "sh", "sql"].includes(
      ext ?? "",
    )
  ) {
    return "text";
  }
  return "binary";
}

// ─── Viewer dispatcher ─────────────────────────────────────────────────────

function Viewer({ kind, url, filename }: { kind: PreviewKind; url: string; filename: string }) {
  switch (kind) {
    case "image":
      return <ImageViewer url={url} alt={filename} />;
    case "pdf":
      return <PdfViewer url={url} filename={filename} />;
    case "csv":
      return <CsvViewer url={url} />;
    case "html":
      return <HtmlViewer url={url} />;
    case "json":
      return <TextViewer url={url} mode="json" />;
    case "markdown":
      return <TextViewer url={url} mode="markdown" />;
    case "text":
      return <TextViewer url={url} mode="text" />;
    case "binary":
      return <BinaryFallback url={url} filename={filename} />;
  }
}

// ─── Individual viewers ────────────────────────────────────────────────────

function ImageViewer({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-foreground/[0.02] p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

function PdfViewer({ url, filename }: { url: string; filename: string }) {
  // Browsers render PDFs natively in <iframe> — no extra dependency needed.
  // #toolbar=0 collapses the heavy chrome on Chromium when the user just wants
  // a glance preview; download/external-tab are already in the panel header.
  return (
    <iframe
      src={`${url}#toolbar=0&navpanes=0`}
      title={filename}
      className="h-full w-full border-0"
    />
  );
}

function HtmlViewer({ url }: { url: string }) {
  // Sandboxed: no script execution, no same-origin access. The user can still
  // see the rendered HTML (incl. styles) but untrusted content can't escape.
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) return <ErrorState message={error} />;
  if (html === null) return <LoadingState />;

  return (
    <iframe
      sandbox=""
      srcDoc={html}
      title="HTML preview"
      className="h-full w-full border-0 bg-white"
    />
  );
}

function CsvViewer({ url }: { url: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (!cancelled) setRows(parseCsv(text));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) return <ErrorState message={error} />;
  if (rows === null) return <LoadingState />;
  if (rows.length === 0) return <EmptyState message="Empty file" />;

  const [header, ...body] = rows;
  // Cap rendered rows so very large CSVs don't freeze the panel.
  const MAX_ROWS = 500;
  const truncated = body.length > MAX_ROWS;
  const visible = truncated ? body.slice(0, MAX_ROWS) : body;

  return (
    <div className="p-3">
      <div className="border-foreground/10 overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-foreground/[0.04] sticky top-0">
            <tr>
              {(header ?? []).map((cell, i) => (
                <th
                  key={i}
                  className="border-foreground/10 border-b px-2.5 py-1.5 text-left font-mono text-[10px] font-semibold tracking-wider uppercase"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri} className="hover:bg-foreground/[0.03]">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-foreground/8 border-b px-2.5 py-1.5 align-top whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-foreground/55 mt-2 text-center font-mono text-[10px] tracking-wider uppercase">
          Showing {MAX_ROWS.toLocaleString()} of {body.length.toLocaleString()} rows · download to see all
        </p>
      )}
    </div>
  );
}

/** Minimal RFC 4180-ish parser: handles quoted fields and escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === "," || c === "\t") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      // swallow CRLF
      if (c === "\r" && text[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += c;
    i++;
  }
  // Flush trailing field/row if file didn't end with newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function TextViewer({ url, mode }: { url: string; mode: "text" | "json" | "markdown" }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => {
        if (cancelled) return;
        if (mode === "json") {
          try {
            setText(JSON.stringify(JSON.parse(t), null, 2));
          } catch {
            setText(t);
          }
        } else {
          setText(t);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [url, mode]);

  if (error) return <ErrorState message={error} />;
  if (text === null) return <LoadingState />;

  if (mode === "markdown") {
    return (
      <div className="prose-sm max-w-none p-4 text-sm">
        <MarkdownContent content={text} />
      </div>
    );
  }

  return (
    <pre
      className={cn(
        "bg-foreground/[0.02] m-0 h-full overflow-auto p-4 font-mono text-xs leading-relaxed",
        "whitespace-pre",
      )}
    >
      {text}
    </pre>
  );
}

function BinaryFallback({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="bg-foreground/8 text-foreground/65 flex h-14 w-14 items-center justify-center rounded-2xl">
        <FileText className="h-6 w-6" />
      </div>
      <div>
        <p className="text-foreground text-sm font-medium">{filename}</p>
        <p className="text-foreground/55 mt-1 text-xs">No inline preview for this file type.</p>
      </div>
      <a
        href={url}
        download={filename}
        className="border-foreground/15 hover:border-foreground/40 hover:bg-foreground/5 mt-2 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </a>
    </div>
  );
}

// ─── State helpers ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="text-foreground/55 flex h-full items-center justify-center gap-2 text-xs">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Loading…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-destructive/80 flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs">
      <AlertCircle className="h-5 w-5" />
      <p>Couldn&apos;t load preview</p>
      <p className="text-foreground/55 font-mono text-[10px] tracking-wider uppercase">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-foreground/55 flex h-full items-center justify-center text-xs">
      {message}
    </div>
  );
}
{% endraw %}
