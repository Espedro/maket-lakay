"use client";

import * as React from "react";
import { Eye, Search, Shield, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { toast } from "@/hooks/use-toast";
import type { AppRole } from "@/lib/auth-roles";
import { formatDate } from "@/lib/utils";
import { getAllProfiles, updateProfileRole, type RealUserProfile } from "@/services/users";

interface UserRow {
  id: string;
  name: string;
  email: string;
  location: string;
  role: AppRole;
  registeredAt: string;
}

function toUserRow(profile: RealUserProfile): UserRow {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    location: [profile.city, profile.country].filter(Boolean).join(", "),
    role: profile.role,
    registeredAt: profile.createdAt,
  };
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

export function UserManagementClient() {
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null);
  const [profiles, setProfiles] = React.useState<RealUserProfile[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const realProfiles = await getAllProfiles();
    setProfiles(realProfiles);
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRoleChange(user: UserRow, nextRole: string) {
    const result = await updateProfileRole(user.id, nextRole as AppRole);

    if (!result.ok) {
      toast({
        title: "Could not update role",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Role updated", description: `${user.name} is now ${nextRole}.` });
    await refresh();
  }

  const allUserRows: UserRow[] = profiles.map(toUserRow);

  const userRows = allUserRows.filter((user) => {
    const normalizedQuery = query.toLowerCase();
    const matchesQuery =
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.location.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  function renderUserActions(user: UserRow) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
        <Eye className="size-4" />
        View
      </Button>
    );
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              User Management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Users</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Real customer, vendor, support, and admin accounts from Supabase.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[260px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search users..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter users by role"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">All roles</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Customers", allUserRows.filter((user) => user.role === "customer").length],
          ["Vendors", allUserRows.filter((user) => user.role === "vendor").length],
          ["Support", allUserRows.filter((user) => user.role === "support").length],
          ["Admins", allUserRows.filter((user) => user.role === "admin").length],
        ].map(([label, value]) => (
          <div key={label} className="border bg-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-5">
        <ResponsiveDataView
          items={userRows}
          getKey={(user) => user.id}
          cardTitle={(user) => user.name}
          cardDescription={(user) => `${user.email} - ${user.location}`}
          cardMeta={(user) => <Badge variant="success">{roleLabel(user.role)}</Badge>}
          cardFields={(user) => [
            { label: "Role", value: roleLabel(user.role) },
            { label: "Registered", value: formatDate(user.registeredAt) },
          ]}
          cardActions={renderUserActions}
          emptyState={
            <div className="border p-6 text-center text-sm text-muted-foreground">
              No users match this search.
            </div>
          }
          table={
          <table className="responsive-table min-w-[900px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Role</th>
                <th className="py-3 font-medium">Email</th>
                <th className="py-3 font-medium">Registration</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3">
                    <p className="font-black">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.location}</p>
                  </td>
                  <td className="py-3">
                    <select
                      aria-label={`Change role for ${user.name}`}
                      className="h-9 border bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={user.role}
                      onChange={(event) => handleRoleChange(user, event.target.value)}
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="support">Support</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3">{user.email}</td>
                  <td className="py-3">{formatDate(user.registeredAt)}</td>
                  <td className="py-3">
                    <div className="dashboard-action-row">
                      {renderUserActions(user)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          }
        />
      </section>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>User profile</DialogTitle>
            <DialogDescription>Real account details from Supabase.</DialogDescription>
          </DialogHeader>
          {selectedUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 border bg-muted/30 p-4">
                <span className="grid size-12 place-items-center bg-primary font-black text-primary-foreground">
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-black">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <ProfileRow label="Role" value={roleLabel(selectedUser.role)} />
              <ProfileRow label="Location" value={selectedUser.location || "Unknown"} />
              <ProfileRow label="Registered" value={formatDate(selectedUser.registeredAt)} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border p-3 text-sm">
      <span className="flex items-center gap-2 font-semibold text-muted-foreground">
        {label === "Role" ? <UserCog className="size-4" /> : <Shield className="size-4" />}
        {label}
      </span>
      <span className="font-black capitalize">{value}</span>
    </div>
  );
}
