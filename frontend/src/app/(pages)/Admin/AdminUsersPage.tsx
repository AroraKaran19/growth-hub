"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PencilLine, Search, UserCog, UsersRound } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { canAccessSection } from "@/config/adminPermissions";
import { updateCustomer, useUsers, type UserKind, type UserRow, type UsersQuery } from "@/hooks/useUsers";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";
import { formatDay, timeAgo } from "@/utils/date";
import { PARTNER_CARD as CARD, PartnerPageHeader as PageHeader, PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import EditAccountModal, { type AccountChange } from "./components/EditAccountModal";
import DisableUserDialog from "./components/users/DisableUserDialog";
import { indiaDay, initials, KIND_AVATAR, KIND_BADGE, KIND_LABEL, KINDS } from "./components/users/userKinds";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

const pathFor = (user: UserRow) =>
  user.kind === "customer" ? `/admin/users/customers/${user.id}` : user.kind === "partner" ? `/admin/partner-staff/${user.id}` : `/admin/staff/${user.id}`;

const detailOf = (user: UserRow) => {
  if (user.kind === "customer") {
    const plans = user.activeMemberships;
    return { main: user.phone ?? "", sub: plans ? `${plans} renewing membership${plans === 1 ? "" : "s"}` : "" };
  }
  if (user.kind === "partner") return { main: user.venueName ?? "Venue removed", sub: "Venue login" };
  if (user.kind === "super-admin") return { main: "Full access", sub: "" };
  return { main: `${user.permissions.length} page${user.permissions.length === 1 ? "" : "s"}`, sub: "" };
};

const AdminUsersPage = () => {
  const { account } = useAdminSession();
  const [kind, setKind] = useState<UserKind | "">("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [disabling, setDisabling] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query: UsersQuery = { kind, status, q, page };
  const { data, error, isLoading, isValidating, mutate } = useUsers(query);

  if (isLoading || !account) return <Skeleton />;

  const isSuper = account.role === "super-admin";
  const canStaff = canAccessSection(account, "users.staff");
  const grantable = isSuper ? undefined : account.permissions;
  const canChange = (user: UserRow) =>
    user.id !== account.id &&
    (user.kind === "customer" || user.kind === "partner" || (user.kind === "admin" ? canStaff : isSuper));

  const counts = data?.counts ?? { customer: 0, partner: 0, admin: 0, "super-admin": 0 };
  const everyone = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const pickKind = (next: UserKind | "") => {
    setKind(next);
    setPage(1);
  };

  const setUserStatus = async (user: UserRow, next: "active" | "disabled") => {
    setBusyId(user.id);
    try {
      let stopped = 0;
      if (user.kind === "customer") stopped = (await updateCustomer(user.id, { status: next })).stoppedMemberships;
      else await adminApi.patch(pathFor(user), { status: next });
      await mutate();
      const name = user.name ?? "This customer";
      toastDone(
        next === "active"
          ? `${name} can sign in again.`
          : stopped
            ? `${name} is disabled and signed out. ${stopped} membership${stopped === 1 ? "" : "s"} will stop renewing.`
            : `${name} is disabled and signed out.`,
      );
      setDisabling(null);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (user: UserRow, change: AccountChange) => {
    if (user.kind === "customer") await updateCustomer(user.id, { name: change.name, email: change.email });
    else await adminApi.patch(pathFor(user), change);
    await mutate();
  };

  const tiles: { value: UserKind | ""; label: string; count: number }[] = [
    { value: "", label: "Everyone", count: everyone },
    ...KINDS.map((item) => ({ value: item.value, label: item.plural, count: counts[item.value] })),
  ];

  return (
    <>
      <PageHeader
        title="Manage users"
        description="Every account on Growth Hub in one place: customers, venue partners, admins and super admins."
        actions={
          canStaff && (
            <Link href="/admin/users/staff" className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary/65 hover:text-tertiary">
              <UserCog aria-hidden="true" className="size-4" />
              Add staff
            </Link>
          )
        }
      />

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary p-3 shadow-xl shadow-tertiary/15">
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/35 blur-3xl" />
        <div role="tablist" aria-label="Account type" className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) => {
            const selected = tile.value === kind;
            return (
              <button
                key={tile.label}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => pickKind(tile.value)}
                className={cn(
                  "rounded-xl px-4 py-3 text-left transition-all",
                  selected ? "bg-secondary text-tertiary shadow-lg" : "text-secondary/70 hover:-translate-y-0.5 hover:bg-secondary/10 hover:text-secondary",
                )}
              >
                <span className="block text-2xl font-bold tabular-nums">{tile.count}</span>
                <span className={cn("block text-sm", selected ? "text-tertiary/60" : "text-secondary/60")}>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-0 grow basis-64">
          <span className="sr-only">Search users</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone"
            className="w-full rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>
        <SelectField
          label="Filter by status"
          hideLabel
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="w-44"
        />
      </div>

      <div className={cn(CARD, "mt-4 overflow-x-auto shadow-lg shadow-tertiary/5 transition-opacity", isValidating && "opacity-70")}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load users. Refresh to try again.
          </p>
        ) : users.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <UsersRound aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
            <p className="mt-3 text-sm text-tertiary/60">{everyone === 0 && !q && !status ? "No accounts yet." : "No one matches these filters."}</p>
          </div>
        ) : (
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">User</th>
                <th scope="col" className="px-5 py-3 font-semibold">Type</th>
                <th scope="col" className="px-5 py-3 font-semibold">Phone or access</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                <th scope="col" className="px-5 py-3 font-semibold">Last active</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {users.map((user) => {
                const detail = detailOf(user);
                const isDisabled = user.status === "disabled";
                const isYou = user.id === account.id;
                return (
                  <tr key={`${user.kind}-${user.id}`} className={cn("transition-colors hover:bg-tertiary/3", isDisabled && "text-tertiary/60")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", KIND_AVATAR[user.kind])}>
                          {initials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-tertiary">
                            {user.name ?? <span className="text-tertiary/50">Unnamed customer</span>}
                            {isYou && <span className="rounded-full bg-tertiary/8 px-2 py-0.5 text-xs font-medium text-tertiary/70">You</span>}
                          </p>
                          <p className="truncate text-xs text-tertiary/55">{user.email ?? "No email yet"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", KIND_BADGE[user.kind])}>{KIND_LABEL[user.kind]}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-tertiary/80">{detail.main}</p>
                      {detail.sub && <p className="text-xs text-tertiary/50">{detail.sub}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", isDisabled ? "bg-tertiary/8 text-tertiary/60" : "bg-green-500/12 text-green-700")}>
                        {isDisabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-tertiary/70">{formatDay(indiaDay(user.joinedAt))}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-tertiary/70">{user.lastActiveAt ? timeAgo(user.lastActiveAt) : "Not signed in"}</td>
                    <td className="px-5 py-3.5">
                      {canChange(user) && (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            aria-label={`Edit ${user.name ?? "customer"}`}
                            onClick={() => setEditing(user)}
                            className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary"
                          >
                            <PencilLine aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === user.id}
                            onClick={() => (isDisabled ? void setUserStatus(user, "active") : setDisabling(user))}
                            className={cn("w-16 text-right text-sm font-medium transition-opacity hover:opacity-75 disabled:opacity-50", isDisabled ? "text-green-700" : "text-primary")}
                          >
                            {isDisabled ? "Enable" : "Disable"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tertiary/55">
            Showing {first} to {first + users.length - 1} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-tertiary shadow-md shadow-tertiary/10 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span className="min-w-20 text-center text-sm font-medium text-tertiary">
              {page} of {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-tertiary shadow-md shadow-tertiary/10 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditAccountModal
          portal={editing.kind === "customer" ? "member" : editing.kind === "partner" ? "partner" : "admin"}
          account={{ id: editing.id, name: editing.name ?? "", email: editing.email ?? "", phone: editing.phone ?? undefined }}
          canEditDetails
          venue={editing.kind === "partner" && editing.venueSlug ? { slug: editing.venueSlug, options: data?.venues ?? [] } : undefined}
          access={
            editing.kind === "admin" || editing.kind === "super-admin"
              ? { permissions: editing.permissions, grantable }
              : undefined
          }
          role={isSuper && (editing.kind === "admin" || editing.kind === "super-admin") ? editing.kind : undefined}
          onSave={(change) => saveEdit(editing, change)}
          onClose={() => setEditing(null)}
        />
      )}

      {disabling && (
        <DisableUserDialog
          user={disabling}
          isSaving={busyId === disabling.id}
          onConfirm={() => void setUserStatus(disabling, "disabled")}
          onClose={() => setDisabling(null)}
        />
      )}
    </>
  );
};

export default AdminUsersPage;
