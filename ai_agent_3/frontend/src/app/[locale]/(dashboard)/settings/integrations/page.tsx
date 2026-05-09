"use client";

import Link from "next/link";
import { ArrowUpRight, Plug, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BrandIcon } from "@/components/marketing/brand-icon";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui";
import { useBilling } from "@/hooks";
import { ROUTES } from "@/lib/constants";

interface IntegrationItem {
  key: string;
  name: string;
  description: string;
  icon?: LucideIcon;
  brand?: "stripe" | "google" | "github" | "microsoft";
  status: "connected" | "available" | "coming-soon";
  cta?: { label: string; href?: string; onClick?: () => void };
}

export default function IntegrationsSettingsPage() {
  const { openPortal, isLoading } = useBilling();

  const oauthEnabled = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const integrations: IntegrationItem[] = [
    {
      key: "stripe",
      name: "Stripe billing",
      description: "Subscriptions, invoices, customer portal — managed by Stripe.",
      brand: "stripe",
      status: "connected",
      cta: {
        label: isLoading ? "Opening…" : "Open Stripe portal",
        onClick: () => openPortal(),
      },
    },
    {
      key: "google",
      name: "Google sign-in",
      description: "Let users sign in with their Google account.",
      brand: "google",
      status: oauthEnabled.includes("google") ? "connected" : "available",
      cta: {
        label: oauthEnabled.includes("google") ? "Manage" : "Configure in env",
        href: oauthEnabled.includes("google") ? undefined : "/help#workspace",
      },
    },
    {
      key: "github",
      name: "GitHub sign-in",
      description: "OAuth via GitHub for dev-focused workspaces.",
      brand: "github",
      status: oauthEnabled.includes("github") ? "connected" : "available",
      cta: {
        label: oauthEnabled.includes("github") ? "Manage" : "Configure in env",
        href: oauthEnabled.includes("github") ? undefined : "/help#workspace",
      },
    },
    {
      key: "microsoft",
      name: "Microsoft sign-in",
      description: "OAuth via Microsoft for enterprise SSO scenarios.",
      brand: "microsoft",
      status: oauthEnabled.includes("microsoft") ? "connected" : "available",
      cta: {
        label: oauthEnabled.includes("microsoft") ? "Manage" : "Configure in env",
        href: oauthEnabled.includes("microsoft") ? undefined : "/help#workspace",
      },
    },
    {
      key: "webhooks",
      name: "Outbound webhooks",
      description: "Send events to your own endpoints when things happen in your workspace.",
      icon: Webhook,
      status: "coming-soon",
    },
    {
      key: "zapier",
      name: "Zapier",
      description: "Connect to 5000+ apps via Zapier triggers and actions.",
      icon: Plug,
      status: "coming-soon",
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Integrations"
        description="Connect external services to your workspace. Most providers are configured at deploy time via environment variables."
      >
        <ul className="space-y-3">
          {integrations.map((it) => (
            <li
              key={it.key}
              className="border-foreground/10 bg-background flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="bg-foreground/8 text-foreground inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  {it.brand ? (
                    <BrandIcon name={it.brand} className="h-4 w-4" aria-hidden />
                  ) : it.icon ? (
                    <it.icon className="h-4 w-4" />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-foreground text-sm font-semibold">{it.name}</p>
                    <StatusPill status={it.status} />
                  </div>
                  <p className="text-foreground/55 mt-0.5 max-w-md text-xs leading-relaxed">
                    {it.description}
                  </p>
                </div>
              </div>
              {it.status !== "coming-soon" && it.cta ? (
                it.cta.href ? (
                  <Button variant="outline" size="sm" asChild className="rounded-full">
                    <Link href={it.cta.href} className="inline-flex items-center gap-1.5">
                      {it.cta.label}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={it.cta.onClick}
                    className="rounded-full"
                  >
                    {it.cta.label}
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Need a custom integration?"
        description="Use the API directly. Send us a feature request if you want a first-class connector."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/docs">API documentation</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href={`${ROUTES.HOME}contact`}>Request integration</Link>
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function StatusPill({ status }: { status: IntegrationItem["status"] }) {
  if (status === "connected") {
    return (
      <span className="bg-brand text-brand-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
        <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
        Connected
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="border-foreground/15 text-foreground/70 inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
        Available
      </span>
    );
  }
  return (
    <span className="border-foreground/10 text-foreground/45 inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
      Coming soon
    </span>
  );
}
