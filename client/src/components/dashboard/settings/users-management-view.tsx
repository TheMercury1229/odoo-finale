"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Ban,
  Calculator,
  CheckCircle2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { authClient } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | number | Date | null;
  createdAt: string | Date;
  emailVerified?: boolean;
  image?: string | null;
}

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateVal?: string | Date | null) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

export function UsersManagementView() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  // Search and filter states
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Dialog state for adding user
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"accountant" | "admin">(
    "accountant"
  );
  const [formError, setFormError] = useState("");

  // Confirmation dialog states
  const [banningUser, setBanningUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  // Fetch users using better-auth admin method
  const {
    data: users = [],
    isLoading,
    isRefetching,
    error: queryError,
    refetch,
  } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await authClient.admin.listUsers({
        query: {
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to load users");
      }

      // Keep only internal staff (exclude external contacts)
      const allUsers = (response.data?.users || []) as AdminUser[];
      return allUsers.filter((u) => u.role !== "contact");
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = newUserName.trim();
      const trimmedEmail = newUserEmail.trim();

      if (!trimmedName) throw new Error("Full name is required.");
      if (!trimmedEmail) throw new Error("Email address is required.");
      if (!newUserPassword || newUserPassword.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const res = await authClient.admin.createUser({
        name: trimmedName,
        email: trimmedEmail,
        password: newUserPassword,
        role: newUserRole,
      });

      if (res.error) {
        throw new Error(res.error.message || "Failed to create user.");
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.add({
        type: "success",
        title: "Accountant added",
        description: `${newUserName} has been added successfully.`,
      });
      setIsAddUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("accountant");
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "An unexpected error occurred.");
    },
  });

  // Ban User Mutation
  const banMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason: string;
    }) => {
      const res = await authClient.admin.banUser({
        userId,
        banReason: reason.trim() || "Suspended by administrator",
      });

      if (res.error) {
        throw new Error(res.error.message || "Failed to ban user.");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.add({
        type: "success",
        title: "User banned",
        description: "The user has been suspended and sessions revoked.",
      });
      setBanningUser(null);
      setBanReason("");
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: "Action failed",
        description: err.message || "Could not ban user.",
      });
    },
  });

  // Unban User Mutation
  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.unbanUser({ userId });
      if (res.error) {
        throw new Error(res.error.message || "Failed to unban user.");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.add({
        type: "success",
        title: "User unbanned",
        description: "The user has been reinstated successfully.",
      });
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: "Action failed",
        description: err.message || "Could not unban user.",
      });
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.removeUser({ userId });
      if (res.error) {
        throw new Error(res.error.message || "Failed to delete user.");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.add({
        type: "success",
        title: "User deleted",
        description: "The user account was removed.",
      });
      setDeletingUser(null);
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: "Action failed",
        description: err.message || "Could not delete user.",
      });
    },
  });

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const accountants = users.filter(
      (u) => (u.role || "").toLowerCase() === "accountant"
    ).length;
    const admins = users.filter(
      (u) => (u.role || "").toLowerCase() === "admin"
    ).length;
    const banned = users.filter((u) => Boolean(u.banned)).length;
    return { total, accountants, admins, banned };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (selectedRoleFilter === "accountant") {
        if ((user.role || "").toLowerCase() !== "accountant") return false;
      } else if (selectedRoleFilter === "admin") {
        if ((user.role || "").toLowerCase() !== "admin") return false;
      } else if (selectedRoleFilter === "banned") {
        if (!user.banned) return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = user.name?.toLowerCase().includes(q);
        const matchesEmail = user.email?.toLowerCase().includes(q);
        const matchesRole = user.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      return true;
    });
  }, [users, selectedRoleFilter, search]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      {/* ─── Top Bar / Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team & Accountants</h1>
          <p className="text-sm text-muted-foreground">
            Manage accountants and internal staff with access to master data,
            journals, invoices, and reports.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              data-icon="inline-start"
              className={isRefetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setFormError("");
              setIsAddUserOpen(true);
            }}
          >
            <UserPlus data-icon="inline-start" />
            Add Accountant
          </Button>
        </div>
      </div>

      {/* ─── Statistics Cards ─── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              Total Staff
              <Users />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              Accountants
              <Calculator />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.accountants}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              Administrators
              <Shield />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.admins}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              Banned Accounts
              <ShieldAlert />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.banned}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* ─── Controls: Search & Toggle Filter ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="w-full sm:w-80">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>

        <ToggleGroup
          value={[selectedRoleFilter]}
          onValueChange={(val) => {
            if (val && val.length > 0) {
              setSelectedRoleFilter(val[val.length - 1]);
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all">
            All ({stats.total})
          </ToggleGroupItem>
          <ToggleGroupItem value="accountant">
            Accountants ({stats.accountants})
          </ToggleGroupItem>
          <ToggleGroupItem value="admin">
            Admins ({stats.admins})
          </ToggleGroupItem>
          <ToggleGroupItem value="banned">
            Banned ({stats.banned})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ─── Staff Members Table ─── */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Spinner />
            <span className="text-sm">Loading team members...</span>
          </div>
        ) : queryError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Failed to load staff list</AlertTitle>
              <AlertDescription>
                {(queryError as Error).message ||
                  "An error occurred while fetching users via Better Auth."}
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No staff members found</EmptyTitle>
              <EmptyDescription>
                {search
                  ? `No members matching "${search}". Try clearing your search.`
                  : selectedRoleFilter !== "all"
                  ? `No members in the "${selectedRoleFilter}" category.`
                  : "No accountants or internal users found. Add your first accountant to get started."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {search || selectedRoleFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedRoleFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
                  <UserPlus data-icon="inline-start" />
                  Add Accountant
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUserId;
                  const isBanned = Boolean(user.banned);
                  const isAccountant =
                    (user.role || "").toLowerCase() === "accountant";
                  const isAdmin = (user.role || "").toLowerCase() === "admin";

                  return (
                    <TableRow key={user.id}>
                      {/* User Avatar & Details */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="default">
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">
                                {user.name}
                              </span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="py-3">
                        {isAdmin ? (
                          <Badge variant="outline" className="gap-1 font-medium">
                            <Shield />
                            Admin
                          </Badge>
                        ) : isAccountant ? (
                          <Badge variant="secondary" className="gap-1 font-medium">
                            <Calculator />
                            Accountant
                          </Badge>
                        ) : (
                          <Badge variant="outline">{user.role || "Staff"}</Badge>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="py-3">
                        {isBanned ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="destructive" className="gap-1 w-fit">
                              <Ban />
                              Banned
                            </Badge>
                            {user.banReason && (
                              <span
                                className="text-[10px] text-muted-foreground truncate max-w-[180px]"
                                title={user.banReason}
                              >
                                Reason: {user.banReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            Active
                          </Badge>
                        )}
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isBanned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unbanMutation.mutate(user.id)}
                              disabled={unbanMutation.isPending}
                            >
                              <CheckCircle2 data-icon="inline-start" />
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCurrent || banMutation.isPending}
                              onClick={() => {
                                setBanningUser(user);
                                setBanReason("");
                              }}
                              title={
                                isCurrent
                                  ? "You cannot ban yourself"
                                  : "Ban user account"
                              }
                            >
                              <Ban data-icon="inline-start" />
                              Ban
                            </Button>
                          )}

                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUser(user)}
                              disabled={deleteMutation.isPending}
                              title="Delete user"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ─── Add Accountant / User Dialog ─── */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Accountant</DialogTitle>
            <DialogDescription>
              Create an internal team account. Accountants have permissions for
              master data, journals, invoices, and financial reports.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate();
            }}
            className="flex flex-col gap-4 py-2"
          >
            {formError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Creation Failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              {/* Name */}
              <Field>
                <FieldLabel htmlFor="user-name">Full Name</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <User />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="user-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </InputGroup>
              </Field>

              {/* Email */}
              <Field>
                <FieldLabel htmlFor="user-email">Email Address</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Mail />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="user-email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. jane@urbanfurniture.local"
                    required
                  />
                </InputGroup>
              </Field>

              {/* Password */}
              <Field>
                <FieldLabel htmlFor="user-password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Lock />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="user-password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </InputGroup>
                <FieldDescription>At least 8 characters long.</FieldDescription>
              </Field>

              {/* System Role */}
              <Field>
                <FieldLabel htmlFor="user-role">System Role</FieldLabel>
                <Select
                  value={newUserRole}
                  onValueChange={(val) => {
                    if (val === "accountant" || val === "admin") {
                      setNewUserRole(val);
                    }
                  }}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="accountant">
                        Accountant (Invoices, Journals, Master Data & Reports)
                      </SelectItem>
                      <SelectItem value="admin">
                        Administrator (Full Business & User Access)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Excludes external contacts. Internal team roles only.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending && (
                  <Spinner data-icon="inline-start" />
                )}
                Create Accountant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Ban Confirmation Alert Dialog ─── */}
      <AlertDialog
        open={Boolean(banningUser)}
        onOpenChange={(open) => !open && setBanningUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Ban className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Ban User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban {banningUser?.name} (
              {banningUser?.email})? They will immediately lose access to the
              system and all active sessions will be terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field className="py-2">
            <FieldLabel htmlFor="ban-reason">Reason (Optional)</FieldLabel>
            <Input
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Account suspended, Left company"
            />
          </Field>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={banMutation.isPending}
              onClick={() => {
                if (banningUser) {
                  banMutation.mutate({
                    userId: banningUser.id,
                    reason: banReason,
                  });
                }
              }}
            >
              {banMutation.isPending && <Spinner data-icon="inline-start" />}
              Confirm Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Confirmation Alert Dialog ─── */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {deletingUser?.name}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingUser) {
                  deleteMutation.mutate(deletingUser.id);
                }
              }}
            >
              {deleteMutation.isPending && <Spinner data-icon="inline-start" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
