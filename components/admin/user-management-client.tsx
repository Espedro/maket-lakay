"use client";

import * as React from "react";
import { Eye, Plus, RotateCcw, Search, Shield, UserCog, UserX } from "lucide-react";

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
import { useAdminManagement } from "@/hooks/use-admin-management";
import { toast } from "@/hooks/use-toast";
import type { AdminAccountStatus, AdminUserRecord, AdminUserRole } from "@/lib/admin-management";
import type { AppRole } from "@/lib/auth-roles";
import { formatDate } from "@/lib/utils";
import { getAllProfiles, updateProfileRole, type RealUserProfile } from "@/services/users";

interface UserRow {
  id: string;
  name: string;
  email: string;
  location: string;
  role: AdminUserRole | AppRole;
  status: AdminAccountStatus;
  registeredAt: string;
  isReal: boolean;
}

function toUserRow(user: AdminUserRecord): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    location: user.location,
    role: user.role,
    status: user.status,
    registeredAt: user.registeredAt,
    isReal: false,
  };
}

function toRealUserRow(profile: RealUserProfile): UserRow {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    location: [profile.city, profile.country].filter(Boolean).join(", "),
    role: profile.role,
    status: "active",
    registeredAt: profile.createdAt,
    isReal: true,
  };
}

type UserAction = {
  label: string;
  userId: string;
  status: AdminAccountStatus;
  message: string;
};

type AddUserForm = {
  email: string;
  location: string;
  name: string;
  role: AdminUserRole;
  status: AdminAccountStatus;
};

const emptyUserForm: AddUserForm = {
  email: "",
  location: "",
  name: "",
  role: "customer",
  status: "active",
};

function statusVariant(status: string) {
  return status === "active" ? "success" : "destructive";
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

export function UserManagementClient() {
  const { addUser, isReady, state, updateUserRole, updateUserStatus } = useAdminManagement();
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [addUserOpen, setAddUserOpen] = React.useState(false);
  const [addUserForm, setAddUserForm] = React.useState<AddUserForm>(emptyUserForm);
  const [addUserError, setAddUserError] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<UserAction | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null);
  const [realProfiles, setRealProfiles] = React.useState<RealUserProfile[]>([]);
  const [realProfilesReady, setRealProfilesReady] = React.useState(false);

  const refreshRealProfiles = React.useCallback(async () => {
    const profiles = await getAllProfiles();
    setRealProfiles(profiles);
    setRealProfilesReady(true);
  }, []);

  React.useEffect(() => {
    refreshRealProfiles();
  }, [refreshRealProfiles]);

  async function handleRoleChange(user: UserRow, nextRole: string) {
    if (user.isReal) {
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
      await refreshRealProfiles();
      return;
    }

    updateUserRole(user.id, nextRole as AdminUserRole);
  }

  const allUserRows: UserRow[] = [
    ...realProfiles.map(toRealUserRow),
    ...state.users.map(toUserRow),
  ];

  const userRows = allUserRows.filter((user) => {
    const normalizedQuery = query.toLowerCase();
    const matchesQuery =
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.location.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesQuery && matchesRole && matchesStatus;
  });

  function confirmAction() {
    if (!pendingAction) return;

    updateUserStatus(pendingAction.userId, pendingAction.status, pendingAction.message);
    setPendingAction(null);
  }

  function updateAddUserField<K extends keyof AddUserForm>(key: K, value: AddUserForm[K]) {
    setAddUserForm((currentForm) => ({ ...currentForm, [key]: value }));
    setAddUserError("");
  }

  function submitAddUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = addUserForm.name.trim();
    const email = addUserForm.email.trim();
    const location = addUserForm.location.trim();

    if (!name || !email || !location) {
      setAddUserError("Name, email, and location are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddUserError("Enter a valid email address.");
      return;
    }

    const created = addUser({
      email,
      location,
      name,
      role: addUserForm.role,
      status: addUserForm.status,
    });

    if (!created) return;

    setAddUserForm(emptyUserForm);
    setAddUserOpen(false);
  }

  function renderUserActions(user: UserRow) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
          <Eye className="size-4" />
          View
        </Button>
        {user.isReal ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPendingAction({
                label: user.status === "suspended" ? "Reactivate user" : "Suspend user",
                userId: user.id,
                status: user.status === "suspended" ? "active" : "suspended",
                message: `${user.name} will be ${
                  user.status === "suspended" ? "reactivated" : "suspended"
                } locally.`,
              })
            }
          >
            {user.status === "suspended" ? (
              <RotateCcw className="size-4" />
            ) : (
              <UserX className="size-4" />
            )}
            {user.status === "suspended" ? "Reactivate" : "Suspend"}
          </Button>
        )}
      </>
    );
  }

  if (!isReady || !realProfilesReady) {
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
              Manage customer accounts, vendor staff, support staff, roles, and account status.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[260px_160px_160px_auto]">
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
              <option value="vendor_staff">Vendor staff</option>
              <option value="support_staff">Support staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              aria-label="Filter users by account status"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <Button type="button" onClick={() => setAddUserOpen(true)}>
              <Plus className="size-4" />
              Add user
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Customers", allUserRows.filter((user) => user.role === "customer").length],
          [
            "Vendor staff",
            allUserRows.filter((user) => user.role === "vendor_staff" || user.role === "vendor")
              .length,
          ],
          [
            "Support staff",
            allUserRows.filter((user) => user.role === "support_staff" || user.role === "support")
              .length,
          ],
          ["Suspended", allUserRows.filter((user) => user.status === "suspended").length],
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
          cardMeta={(user) => <Badge variant={statusVariant(user.status)}>{user.status}</Badge>}
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
          <table className="responsive-table min-w-[1000px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Role</th>
                <th className="py-3 font-medium">Email</th>
                <th className="py-3 font-medium">Account status</th>
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
                      {user.isReal ? (
                        <>
                          <option value="customer">Customer</option>
                          <option value="vendor">Vendor</option>
                          <option value="support">Support</option>
                          <option value="admin">Admin</option>
                        </>
                      ) : (
                        <>
                          <option value="customer">Customer</option>
                          <option value="vendor_staff">Vendor staff</option>
                          <option value="support_staff">Support staff</option>
                          <option value="admin">Admin</option>
                        </>
                      )}
                    </select>
                    {user.isReal ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Real account
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3">{user.email}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                  </td>
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
            <DialogDescription>Admin profile view. No backend profile is loaded.</DialogDescription>
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
              <ProfileRow label="Status" value={selectedUser.status} />
              <ProfileRow label="Location" value={selectedUser.location} />
              <ProfileRow label="Registered" value={formatDate(selectedUser.registeredAt)} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create a local user for admin testing. No invite is sent and no backend account is created.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitAddUser}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Full name">
                <Input
                  className="rounded-none shadow-none"
                  required
                  value={addUserForm.name}
                  onChange={(event) => updateAddUserField("name", event.target.value)}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  className="rounded-none shadow-none"
                  required
                  type="email"
                  value={addUserForm.email}
                  onChange={(event) => updateAddUserField("email", event.target.value)}
                />
              </FormField>
              <FormField label="Role">
                <select
                  className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={addUserForm.role}
                  onChange={(event) => updateAddUserField("role", event.target.value as AdminUserRole)}
                >
                  <option value="customer">Customer</option>
                  <option value="vendor_staff">Vendor staff</option>
                  <option value="support_staff">Support staff</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={addUserForm.status}
                  onChange={(event) =>
                    updateAddUserField("status", event.target.value as AdminAccountStatus)
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </FormField>
              <FormField label="Location">
                <Input
                  className="rounded-none shadow-none"
                  placeholder="Port-au-Prince, Haiti"
                  required
                  value={addUserForm.location}
                  onChange={(event) => updateAddUserField("location", event.target.value)}
                />
              </FormField>
            </div>
            {addUserError ? (
              <p className="border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {addUserError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add user</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>This updates local account status only.</DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">{pendingAction?.message}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
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
