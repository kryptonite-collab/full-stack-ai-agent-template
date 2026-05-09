"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import { EmptyState } from "@/components/states";
import { apiClient, ApiError } from "@/lib/api-client";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at?: string | null;
}

interface ApiKeyCreated extends ApiKey {
  token: string;
}

interface ApiKeyList {
  items: ApiKey[];
  total: number;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const refresh = async () => {
    try {
      const data = await apiClient.get<ApiKeyList>("/api-keys");
      setKeys(data.items);
    } catch {
      // Backend may not be wired yet — keep list empty silently
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sortedKeys = useMemo(
    () => [...keys].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [keys],
  );

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Name your key — e.g. 'Production server'");
      return;
    }
    setCreating(true);
    try {
      const created = await apiClient.post<ApiKeyCreated>("/api-keys", { name });
      setKeys((prev) => [{ ...created, token: undefined as unknown as string } as ApiKey, ...prev]);
      setRevealedToken(created.token);
      setNewName("");
      setCreateOpen(false);
      setRevealOpen(true);
      setShowFull(false);
      setCopied(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiClient.delete(`/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revoke key");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(revealedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Failed to copy — copy manually from the field");
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-foreground/55 font-mono text-[11px] tracking-wider uppercase">
          {sortedKeys.length} {sortedKeys.length === 1 ? "key" : "keys"}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New key
        </Button>
      </div>

      {sortedKeys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to authenticate machine-to-machine requests against the API."
          cta={{ label: "Create your first key", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <ul className="space-y-2">
          {sortedKeys.map((key) => (
            <li
              key={key.id}
              className="border-foreground/10 bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-semibold">{key.name}</p>
                <p className="text-foreground/55 mt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-foreground/85">{key.prefix}</span>
                  <span className="text-foreground/30">·</span>
                  <span>Created {formatDate(key.created_at)}</span>
                  {key.last_used_at && (
                    <>
                      <span className="text-foreground/30">·</span>
                      <span>Used {formatDate(key.last_used_at)}</span>
                    </>
                  )}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 shrink-0 rounded-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only ml-1.5 sm:not-sr-only">Revoke</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke &ldquo;{key.name}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Any service using this key will stop working immediately. You can&apos;t undo
                      this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRevoke(key.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revoke key
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label
              htmlFor="key-name"
              className="text-foreground/80 text-xs font-medium tracking-wider uppercase"
            >
              Name
            </Label>
            <Input
              id="key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Production server"
              className="h-10 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <p className="text-foreground/55 text-xs">
              Pick something memorable so you can rotate it later.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-full">
              {creating ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal-once dialog */}
      <Dialog
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open);
          if (!open) {
            setRevealedToken("");
            setShowFull(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save your key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-foreground/70 text-sm leading-relaxed">
              This is the <strong>only time</strong> you&apos;ll see the full key. Copy it to a
              secret manager — we hash and store only a prefix.
            </p>
            <div className="border-foreground/10 bg-foreground/[0.04] flex items-center gap-2 rounded-xl border p-3">
              <code className="text-foreground flex-1 font-mono text-xs break-all">
                {showFull
                  ? revealedToken
                  : revealedToken.replace(/(.{6}).+/, "$1" + "•".repeat(40))}
              </code>
              <button
                type="button"
                onClick={() => setShowFull((s) => !s)}
                className="text-foreground/55 hover:text-foreground hover:bg-foreground/5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                title={showFull ? "Hide" : "Show"}
              >
                {showFull ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  copied
                    ? "bg-brand text-brand-foreground"
                    : "text-foreground/55 hover:text-foreground hover:bg-foreground/5"
                }`}
                title={copied ? "Copied" : "Copy"}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealOpen(false)} className="rounded-full">
              I&apos;ve saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
