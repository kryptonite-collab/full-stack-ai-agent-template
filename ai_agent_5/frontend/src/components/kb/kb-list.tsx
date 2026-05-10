"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import type { KnowledgeBase } from "@/types";

interface KBListProps {
  kbs: KnowledgeBase[];
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

const scopeColors: Record<string, string> = {
  personal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  org: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  app: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const scopeLabels: Record<string, string> = {
  personal: "personal",
  org: "organization",
  app: "app",
};

export function KBList({ kbs, onDelete, canDelete = true }: KBListProps) {
  const grouped = kbs.reduce<Record<string, KnowledgeBase[]>>((acc, kb) => {
    const bucket = acc[kb.scope] ?? (acc[kb.scope] = []);
    bucket.push(kb);
    return acc;
  }, {});

  const sections = [
    { key: "personal", label: "Personal" },
    { key: "org", label: "Organization" },
    { key: "app", label: "App-wide" },
  ].filter((s) => grouped[s.key]?.length);

  if (!kbs.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No knowledge bases yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map(({ key, label }) => (
        <div key={key}>
          <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            {label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(grouped[key] ?? []).map((kb) => (
              <Card key={kb.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-sm font-medium">{kb.name}</CardTitle>
                      {kb.description && (
                        <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                          {kb.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      className={`shrink-0 px-1.5 py-0.5 text-[10px] ${scopeColors[kb.scope]}`}
                    >
                      {scopeLabels[kb.scope] ?? kb.scope}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                    {kb.is_default ? "Default" : "Knowledge base"}
                  </span>
                  {canDelete && !kb.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      onClick={() => onDelete(kb.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
