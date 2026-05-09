import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  Database,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BACKEND_URL, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  featured?: boolean;
}

const ACTIONS: Action[] = [
  {
    label: "Start a chat",
    description: "Talk to your AI assistant",
    icon: MessageSquare,
    href: ROUTES.CHAT,
    featured: true,
  },
  {
    label: "Upload to KB",
    description: "Index a doc, sheet, or URL",
    icon: Database,
    href: ROUTES.RAG,
  },
  {
    label: "Invite team",
    description: "Bring teammates in",
    icon: Users,
    href: ROUTES.ORGS,
  },
  {
    label: "Billing & credits",
    description: "Subscription and usage",
    icon: CreditCard,
    href: ROUTES.BILLING,
  },
  {
    label: "Settings",
    description: "Profile, API keys, prefs",
    icon: Settings,
    href: ROUTES.SETTINGS,
  },
  {
    label: "API docs",
    description: "OpenAPI / Swagger",
    icon: BookOpen,
    href: `${BACKEND_URL}/docs`,
    external: true,
  },
];

export function QuickActions() {
  return (
    <div className="border-border bg-card flex h-full flex-col rounded-2xl border p-5 lg:p-6">
      <h2 className="font-display text-foreground mb-4 text-base font-semibold">Quick actions</h2>
      <div className="grid flex-1 grid-cols-2 gap-2.5">
        {ACTIONS.map((action) => (
          <ActionTile key={action.label} action={action} />
        ))}
      </div>
    </div>
  );
}

function ActionTile({ action }: { action: Action }) {
  const inner = (
    <div
      className={cn(
        "lift group relative flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors",
        action.featured
          ? "border-brand/40 bg-brand/[0.08]"
          : "border-foreground/10 hover:border-foreground/30",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            action.featured ? "bg-brand text-brand-foreground" : "bg-foreground/8 text-foreground",
          )}
        >
          <action.icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="text-foreground/40 group-hover:text-foreground h-4 w-4 transition-colors" />
      </div>
      <div>
        <p className="text-foreground text-sm font-semibold">{action.label}</p>
        <p className="text-foreground/55 mt-0.5 text-xs">{action.description}</p>
      </div>
    </div>
  );

  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={action.href}>{inner}</Link>;
}
