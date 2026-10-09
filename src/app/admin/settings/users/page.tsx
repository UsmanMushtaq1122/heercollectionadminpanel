"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  UserX,
  Trash2,
  Shield,
  Users as UsersIcon,
  Crown,
  UserCog,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { User, Role, ROLE_PERMISSIONS } from "@/types";
import { adminSettingsService } from "@/lib/admin-services";

const ROLE_META: Record<
  Role,
  { label: string; color: string; icon: React.ReactNode }
> = {
  super_admin: {
    label: "Super Admin",
    color: "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20",
    icon: <Crown className="h-4 w-4" />,
  },
  admin: {
    label: "Admin",
    color: "bg-[#C9A27E]/15 text-[#B8906A] border border-[#C9A27E]/20",
    icon: <Shield className="h-4 w-4" />,
  },
  staff: {
    label: "Staff",
    color: "bg-blue-50 text-blue-600 border border-blue-200",
    icon: <UserCog className="h-4 w-4" />,
  },
  content_manager: {
    label: "Content Manager",
    color: "bg-green-50 text-green-600 border border-green-200",
    icon: <FileText className="h-4 w-4" />,
  },
};

const FALLBACK_ROLE_META = {
  label: "Admin",
  color: "bg-[#C9A27E]/15 text-[#B8906A] border border-[#C9A27E]/20",
  icon: <Shield className="h-4 w-4" />,
};

function getRoleMeta(role: string) {
  return ROLE_META[role.toLowerCase() as Role] ?? FALLBACK_ROLE_META;
}

const RESOURCES = [
  "Products",
  "Categories",
  "Orders",
  "Customers",
  "Content",
  "Reviews",
  "Coupons",
  "Payments",
  "Settings",
  "Analytics",
];

const ACTIONS: ("Create" | "Read" | "Update" | "Delete")[] = [
  "Create",
  "Read",
  "Update",
  "Delete",
];

const RESOURCE_KEY_MAP: Record<string, string> = {
  Products: "products",
  Categories: "categories",
  Orders: "orders",
  Customers: "customers",
  Content: "content",
  Reviews: "reviews",
  Coupons: "coupons",
  Payments: "payments",
  Settings: "settings",
  Analytics: "analytics",
};

const ACTION_KEY_MAP: Record<string, string> = {
  Create: "create",
  Read: "read",
  Update: "update",
  Delete: "delete",
};

const PERMISSIONS_DATA: Record<Role, Record<string, string[]>> = {
  super_admin: Object.fromEntries(
    RESOURCES.map((r) => [r, ACTIONS.map((a) => a.toLowerCase())])
  ),
  admin: {
    Products: ["create", "read", "update", "delete"],
    Categories: ["create", "read", "update", "delete"],
    Orders: ["read", "update"],
    Customers: ["read", "update"],
    Content: [],
    Reviews: ["read", "update", "delete"],
    Coupons: ["create", "read", "update", "delete"],
    Payments: ["read", "update"],
    Settings: ["read", "update"],
    Analytics: ["read"],
  },
  staff: {
    Products: ["read", "update"],
    Categories: [],
    Orders: ["read", "update"],
    Customers: ["read"],
    Content: [],
    Reviews: ["read"],
    Coupons: [],
    Payments: [],
    Settings: [],
    Analytics: [],
  },
  content_manager: {
    Products: ["read"],
    Categories: ["read", "update"],
    Orders: [],
    Customers: [],
    Content: ["create", "read", "update", "delete"],
    Reviews: ["read", "update"],
    Coupons: [],
    Payments: [],
    Settings: [],
    Analytics: [],
  },
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => adminSettingsService.getUsers(),
  });
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      adminSettingsService.inviteUser(data),
    onSuccess: () => {
      toast("success", "Invitation sent successfully");
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("staff");
      invalidateUsers();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      adminSettingsService.updateUserStatus(id, !selectedUser?.isActive),
    onSuccess: () => {
      if (selectedUser) {
        toast(
          "success",
          selectedUser.isActive
            ? "User deactivated"
            : "User reactivated"
        );
      }
      setDeactivateOpen(false);
      setSelectedUser(null);
      invalidateUsers();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminSettingsService.removeUser(id),
    onSuccess: () => {
      if (selectedUser) {
        toast("success", "User removed");
      }
      setRemoveOpen(false);
      setSelectedUser(null);
      invalidateUsers();
    },
  });

  const handleInvite = () => {
    if (!inviteName || !inviteEmail) return;
    inviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          Admin Users
        </h1>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              initials={user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                            />
                            <span className="font-medium text-[#1A1A1A]">
                              {user.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[#1A1A1A]/50">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleMeta(user.role).color}`}
                          >
                            {getRoleMeta(user.role).icon}
                            {getRoleMeta(user.role).label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-[#1A1A1A]/50">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditRoleOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeactivateOpen(true);
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setRemoveOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <div className="space-y-6">
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(["super_admin", "admin", "staff", "content_manager"] as Role[]).map(
                  (role) => {
                    const meta = ROLE_META[role];
                    const perms = ROLE_PERMISSIONS[role];
                    return (
                      <Card key={role}>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-sm ${meta.color}`}
                            >
                              {meta.icon}
                            </div>
                            <CardTitle className="text-base">
                              {meta.label}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-1.5">
                            {perms.map((perm) =>
                              perm.resource === "all"
                                ? ["Products", "Categories", "Orders", "Customers", "Content", "Reviews", "Coupons", "Payments", "Settings", "Analytics"].map((r) => (
                                    <div
                                      key={r}
                                      className="flex items-center gap-1 text-xs text-[#1A1A1A]/60"
                                    >
                                      <Check className="h-3 w-3 text-[#B8906A]" />
                                      {r}
                                    </div>
                                  ))
                                : perm.actions.map((action) => (
                                    <div
                                      key={`${perm.resource}-${action}`}
                                      className="flex items-center gap-1 text-xs text-[#1A1A1A]/60"
                                    >
                                      <Check className="h-3 w-3 text-[#B8906A]" />
                                      {perm.resource}
                                    </div>
                                  ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Permission Matrix</CardTitle>
                  <CardDescription>
                    Detailed view of permissions per resource and action
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Resource</TableHead>
                          {ACTIONS.map((action) => (
                            <TableHead key={action} className="text-center">
                              {action}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {RESOURCES.map((resource) => (
                          <TableRow key={resource}>
                            <TableCell className="font-medium text-[#1A1A1A]">
                              {resource}
                            </TableCell>
                            {ACTIONS.map((action) => {
                              const actionKey = ACTION_KEY_MAP[action];
                              const isSuperAdminAllowed =
                                PERMISSIONS_DATA.super_admin[resource]?.includes(
                                  actionKey
                                );
                              return (
                                <TableCell key={action} className="text-center">
                                  {isSuperAdminAllowed && (
                                    <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-sm bg-[#C9A27E]/15">
                                      <Check className="h-3.5 w-3.5 text-[#B8906A]" />
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to join the admin panel
          </DialogDescription>
          <div className="mt-5 space-y-4">
            <Input
              label="Name"
              placeholder="Full name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="content_manager">Content Manager</option>
            </Select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={inviteMutation.isPending}
              onClick={handleInvite}
            >
              Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Change the role for {selectedUser?.name}
          </DialogDescription>
          <div className="mt-5">
            <Select
              label="Role"
              defaultValue={selectedUser?.role}
              onChange={(e) => {
                if (selectedUser) {
                  adminSettingsService
                    .updateUserRole(selectedUser.id, e.target.value)
                    .then(() => {
                      toast("success", "Role updated");
                      setEditRoleOpen(false);
                      invalidateUsers();
                    });
                }
              }}
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="content_manager">Content Manager</option>
            </Select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogTitle>
            {selectedUser?.isActive ? "Deactivate" : "Reactivate"} User
          </DialogTitle>
          <DialogDescription>
            {selectedUser?.isActive
              ? `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the admin panel.`
              : `Reactivate ${selectedUser?.name}? They will regain access to the admin panel.`}
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isActive ? "destructive" : "default"}
              loading={deactivateMutation.isPending}
              onClick={() => {
                if (selectedUser) {
                  deactivateMutation.mutate(selectedUser.id);
                }
              }}
            >
              {selectedUser?.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogTitle>Remove User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently remove {selectedUser?.name}?
            This action cannot be undone.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={removeMutation.isPending}
              onClick={() => {
                if (selectedUser) {
                  removeMutation.mutate(selectedUser.id);
                }
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
