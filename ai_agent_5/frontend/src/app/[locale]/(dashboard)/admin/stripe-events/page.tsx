"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Filter, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/states";
import { Badge, Button, Input } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface StripeEvent {
  id: string;
  type: string;
  status: "processed" | "failed" | "pending";
  livemode: boolean;
  customer_email?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  created_at: string;
  attempts: number;
  last_error?: string | null;
}

const STATUS_FILTER_OPTIONS = ["all", "processed", "failed", "pending"] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatAmount(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (typeof cents !== "number") return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (currency ?? "USD").toUpperCase(),
    minimumFractionDigits: 0,
  });
}

// Stub data for the layout — backend wishlist: GET /admin/stripe-events
const STUB_EVENTS: StripeEvent[] = [
  {
    id: "evt_3PqWzL2eZvKYlo2C0K",
    type: "invoice.payment_succeeded",
    status: "processed",
    livemode: true,
    customer_email: "maya@lumenlabs.co",
    amount_cents: 2900,
    currency: "usd",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    attempts: 1,
  },
  {
    id: "evt_3PqWzM2eZvKYlo2DRT",
    type: "customer.subscription.updated",
    status: "processed",
    livemode: true,
    customer_email: "jonas@stash.ai",
    created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    attempts: 1,
  },
  {
    id: "evt_3PqWzN2eZvKYlo2EX7",
    type: "invoice.payment_failed",
    status: "failed",
    livemode: true,
    customer_email: "ops@northwind.io",
    amount_cents: 9900,
    currency: "usd",
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    attempts: 3,
    last_error: "Card declined: insufficient_funds",
  },
  {
    id: "evt_3PqWzO2eZvKYlo2F8M",
    type: "checkout.session.completed",
    status: "processed",
    livemode: true,
    customer_email: "priya@example.io",
    amount_cents: 2900,
    currency: "usd",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    attempts: 1,
  },
  {
    id: "evt_3PqWzP2eZvKYlo2GZQ",
    type: "customer.subscription.deleted",
    status: "processed",
    livemode: false,
    customer_email: "test@example.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    attempts: 1,
  },
  {
    id: "evt_3PqWzQ2eZvKYlo2HHb",
    type: "invoice.created",
    status: "pending",
    livemode: true,
    customer_email: "billing@megacorp.com",
    amount_cents: 49900,
    currency: "usd",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    attempts: 0,
  },
];

export default function StripeEventsPage() {
  const [events, setEvents] = useState<StripeEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [usingStub, setUsingStub] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient
        .get<{ items: StripeEvent[] }>("/admin/stripe-events?limit=50")
        .catch(() => null);
      if (data) {
        setEvents(data.items);
        setUsingStub(false);
      } else {
        setEvents(STUB_EVENTS);
        setUsingStub(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q) {
        return (
          e.id.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          (e.customer_email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, search, statusFilter]);

  const handleReplay = async (evt: StripeEvent) => {
    if (usingStub) {
      toast.info("Demo mode — backend wiring required (POST /admin/stripe-events/{id}/replay)");
      return;
    }
    try {
      await apiClient.post(`/admin/stripe-events/${evt.id}/replay`);
      toast.success(`Replayed ${evt.type}`);
      load();
    } catch {
      toast.error("Replay failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
            Stripe events
          </h2>
          <p className="text-foreground/55 text-xs">
            Webhook event log. Replay failed events to debug billing flows.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="rounded-full">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {usingStub && (
        <div className="border-foreground/10 bg-foreground/[0.03] flex items-start gap-3 rounded-xl border p-4">
          <span className="bg-foreground/8 text-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Filter className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">Demo data</p>
            <p className="text-foreground/55 mt-0.5 text-xs leading-relaxed">
              Backend wiring required. Expected endpoints:{" "}
              <code className="font-mono">GET /admin/stripe-events</code>,{" "}
              <code className="font-mono">POST /admin/stripe-events/&#123;id&#125;/replay</code>.
              Once wired, this page renders real event history.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-foreground/45 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search id, type, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-full pl-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "border-foreground/15 inline-flex rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors",
                statusFilter === s
                  ? "bg-foreground text-background border-foreground"
                  : "text-foreground/65 hover:text-foreground hover:border-foreground/40",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Events table */}
      <div className="border-foreground/10 bg-card overflow-hidden rounded-2xl border">
        <div className="border-foreground/10 text-foreground/55 hidden grid-cols-[24px_1.4fr_1fr_0.8fr_0.5fr_0.5fr_80px] items-center gap-3 border-b px-5 py-3 font-mono text-[10px] tracking-wider uppercase sm:grid">
          <span />
          <span>Event</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Time</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingState variant="skeleton-list" rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-foreground/55 text-sm">No events match.</p>
          </div>
        ) : (
          <ul className="divide-foreground/10 divide-y">
            {filtered.map((e) => (
              <li key={e.id}>
                <div
                  className="hover:bg-foreground/[0.03] grid cursor-pointer grid-cols-[24px_1fr] gap-3 px-5 py-3 transition-colors sm:grid-cols-[24px_1.4fr_1fr_0.8fr_0.5fr_0.5fr_80px]"
                  onClick={() => setExpanded((cur) => (cur === e.id ? null : e.id))}
                >
                  <button
                    type="button"
                    aria-label={expanded === e.id ? "Collapse" : "Expand"}
                    className="text-foreground/45 flex h-6 w-6 items-center justify-center"
                  >
                    {expanded === e.id ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{e.type}</p>
                    <p className="text-foreground/45 truncate font-mono text-[11px]">{e.id}</p>
                  </div>

                  <div className="hidden min-w-0 truncate text-sm sm:block">
                    {e.customer_email ?? <span className="text-foreground/40">—</span>}
                  </div>

                  <div className="hidden text-sm tabular-nums sm:block">
                    {formatAmount(e.amount_cents, e.currency)}
                  </div>

                  <div className="hidden sm:block">
                    <StatusPill status={e.status} attempts={e.attempts} />
                  </div>

                  <div className="text-foreground/55 hidden font-mono text-[11px] tracking-wider uppercase sm:block">
                    {formatDateTime(e.created_at)}
                  </div>

                  <div className="hidden justify-end sm:flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleReplay(e);
                      }}
                      className="rounded-full"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded === e.id && (
                  <div className="border-foreground/10 bg-foreground/[0.02] border-t px-5 py-4">
                    <dl className="grid gap-3 text-xs sm:grid-cols-2">
                      <KV label="Event ID" value={e.id} mono />
                      <KV label="Type" value={e.type} mono />
                      <KV
                        label="Mode"
                        value={e.livemode ? "live" : "test"}
                        accent={e.livemode ? "brand" : undefined}
                      />
                      <KV label="Attempts" value={String(e.attempts)} />
                      {e.customer_email && <KV label="Customer" value={e.customer_email} />}
                      {typeof e.amount_cents === "number" && (
                        <KV label="Amount" value={formatAmount(e.amount_cents, e.currency)} />
                      )}
                      <KV label="Created" value={formatDateTime(e.created_at)} />
                      {e.last_error && (
                        <KV label="Last error" value={e.last_error} accent="danger" />
                      )}
                    </dl>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReplay(e)}
                        className="rounded-full"
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Replay
                      </Button>
                      <a
                        href={`https://dashboard.stripe.com/${e.livemode ? "" : "test/"}events/${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/65 hover:text-foreground inline-flex items-center gap-1 font-mono text-[11px] tracking-wider uppercase"
                      >
                        Open in Stripe →
                      </a>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, attempts }: { status: StripeEvent["status"]; attempts: number }) {
  const tone =
    status === "processed"
      ? "border-brand/30 text-brand"
      : status === "failed"
        ? "border-destructive/30 text-destructive"
        : "border-yellow-500/30 text-yellow-500";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase",
        tone,
      )}
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
      {status}
      {attempts > 1 && ` · ${attempts}×`}
    </span>
  );
}

function KV({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: "brand" | "danger";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-foreground/45 font-mono text-[10px] tracking-wider uppercase">{label}</dt>
      <dd
        className={cn(
          "break-all",
          mono ? "font-mono" : "",
          accent === "brand"
            ? "text-brand"
            : accent === "danger"
              ? "text-destructive"
              : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
