"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Shield } from "lucide-react";

import { UserDetailDrawer } from "@/components/admin/user-detail-drawer";
import { EmptyState, LoadingState } from "@/components/states";
import { Badge, Button, Input } from "@/components/ui";
import { useAdminUsers } from "@/hooks";
import type { AdminUserRead } from "@/hooks/use-admin-users";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Math.round((Date.now() - t) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const { users, total, isLoading, fetchUsers, updateUser, deleteUser, impersonateUser } =
    useAdminUsers();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawerUser, setDrawerUser] = useState<AdminUserRead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(
    (pg: number, q: string) => {
      fetchUsers({ skip: pg * PAGE_SIZE, limit: PAGE_SIZE, search: q || undefined });
    },
    [fetchUsers],
  );

  useEffect(() => {
    load(0, "");
  }, [load]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(0);
    load(0, q);
  };

  const handleOpenUser = (user: AdminUserRead) => {
    setDrawerUser(user);
    setDrawerOpen(true);
  };

  // Keep the drawer's user object in sync with updates from the hook.
  useEffect(() => {
    if (drawerUser) {
      const fresh = users.find((u) => u.id === drawerUser.id);
      if (fresh && fresh !== drawerUser) setDrawerUser(fresh);
    }
  }, [users, drawerUser]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
            Users
          </h2>
          <p className="text-foreground/55 text-xs">
            {total.toLocaleString()} total · click a row to inspect, suspend, or impersonate
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="text-foreground/45 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 rounded-full pl-9 text-sm"
          />
        </div>
      </div>

      <div className="border-foreground/10 bg-card overflow-hidden rounded-2xl border">
        {/* Table head */}
        <div className="border-foreground/10 text-foreground/55 grid grid-cols-[1.6fr_0.8fr_0.6fr_0.6fr_0.4fr] items-center gap-3 border-b px-5 py-3 font-mono text-[10px] tracking-wider uppercase">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Joined</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="p-5">
            <LoadingState variant="skeleton-list" rows={6} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Search}
              title="No users match"
              description={
                search ? `Nothing for "${search}". Try a different query.` : "No users yet."
              }
            />
          </div>
        ) : (
          <ul className="divide-foreground/10 divide-y">
            {users.map((u) => (
              <li
                key={u.id}
                onClick={() => handleOpenUser(u)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenUser(u);
                  }
                }}
                role="button"
                tabIndex={0}
                className="hover:bg-foreground/[0.03] grid cursor-pointer grid-cols-[1.6fr_0.8fr_0.6fr_0.6fr_0.4fr] items-center gap-3 px-5 py-3 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-foreground/8 text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold">
                    {(u.full_name || u.email)
                      .split(/[\s@]/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase() ?? "")
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {u.full_name || u.email.split("@")[0]}
                    </p>
                    <p className="text-foreground/55 truncate font-mono text-[11px]">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground/70 font-mono text-[11px] tracking-wider uppercase">
                    {u.role}
                  </span>
                  {u.is_app_admin && (
                    <Badge className="bg-brand text-brand-foreground border-transparent text-[9px]">
                      <Shield className="mr-0.5 h-2.5 w-2.5" />
                      App
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase",
                    u.is_active
                      ? "border-brand/30 text-brand"
                      : "border-destructive/30 text-destructive",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1 w-1 rounded-full",
                      u.is_active ? "bg-brand" : "bg-destructive",
                    )}
                  />
                  {u.is_active ? "Active" : "Suspended"}
                </span>
                <span className="text-foreground/55 font-mono text-[11px] tracking-wider uppercase">
                  {formatRelative(u.created_at)}
                </span>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUser(u);
                    }}
                    className="rounded-full"
                  >
                    Inspect →
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-foreground/10 flex items-center justify-between border-t px-5 py-3">
            <p className="text-foreground/55 font-mono text-[11px] tracking-wider uppercase">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(page - 1);
                  load(page - 1, search);
                }}
                disabled={page === 0}
                className="rounded-full"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(page + 1);
                  load(page + 1, search);
                }}
                disabled={page + 1 >= totalPages}
                className="rounded-full"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserDetailDrawer
        user={drawerUser}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={updateUser}
        onDelete={deleteUser}
        onImpersonate={impersonateUser}
      />
    </div>
  );
}
