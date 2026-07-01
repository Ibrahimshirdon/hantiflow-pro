import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUserByAdmin,
  type UpdateUserByAdminInput,
} from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type {
  CustomerProfile,
  DriverProfile,
  StaffProfile,
  SupplierProfile,
  UserRole,
} from "@/types/auth.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "./CreateUserDialog";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(ts: { _seconds: number } | undefined) {
  return ts ? new Date(ts._seconds * 1000).toLocaleDateString() : "—";
}

export function UsersPage() {
  const { t } = useTranslation(["auth", "common"]);
  const { profile } = useAuth();

  const ROLE_FILTERS: { value: UserRole | "all"; label: string }[] = [
    { value: "all", label: t("users.allRoles") },
    { value: "admin", label: t("common:roles.admin") },
    { value: "manager", label: t("common:roles.manager") },
    { value: "staff", label: t("common:roles.staff") },
    { value: "customer", label: t("common:roles.customer") },
    { value: "supplier", label: t("common:roles.supplier") },
    { value: "driver", label: t("common:roles.driver") },
  ];
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [viewingUid, setViewingUid] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserByAdminInput>({});
  const [newPassword, setNewPassword] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () => listUsers(roleFilter === "all" ? undefined : roleFilter),
  });

  const { data: viewingUser, isLoading: isLoadingViewingUser } = useQuery({
    queryKey: ["user", viewingUid],
    queryFn: () => getUser(viewingUid!),
    enabled: viewingUid !== null,
  });

  const { data: editingUser } = useQuery({
    queryKey: ["user", editingUid],
    queryFn: () => getUser(editingUid!),
    enabled: editingUid !== null,
  });

  useEffect(() => {
    if (!editingUser) return;
    const p = editingUser.profile as Record<string, string> | null;
    setEditForm({
      displayName: editingUser.displayName,
      phone: editingUser.phone ?? "",
      username: editingUser.username ?? "",
      employeeId: p?.employeeId ?? "",
      department: p?.department ?? "",
      companyName: p?.companyName ?? "",
      vehicleType: p?.vehicleType ?? "",
      licensePlate: p?.licensePlate ?? "",
    });
  }, [editingUser]);

  const updateMutation = useMutation({
    mutationFn: () => updateUserByAdmin(editingUid!, editForm),
    onSuccess: () => {
      toast.success(t("users.toasts.updated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", editingUid] });
      setEditingUid(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: "active" | "suspended" }) =>
      setUserStatus(uid, status),
    onSuccess: () => {
      toast.success(t("users.toasts.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteUser(uid),
    onSuccess: () => {
      toast.success(t("users.toasts.deleted"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUid(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetUserPassword(resettingUid!, newPassword),
    onSuccess: () => {
      toast.success(t("users.toasts.passwordReset"));
      setResettingUid(null);
      setNewPassword("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deletingUser = users?.find((u) => u.uid === deletingUid);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
          <p className="text-muted-foreground">{t("users.subtitle")}</p>
        </div>
        <CreateUserDialog />
      </div>

      <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | "all")}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("common:fields.email")}</TableHead>
            <TableHead>{t("common:fields.role")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && users?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("users.empty")}
              </TableCell>
            </TableRow>
          )}
          {users?.map((user) => {
            const isSelf = user.uid === profile?.uid;
            return (
              <TableRow
                key={user.uid}
                className="cursor-pointer"
                onClick={() => setViewingUid(user.uid)}
              >
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{t(`common:roles.${user.role}`)}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "active" ? "success" : "destructive"}>
                    {t(`common:status.${user.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          uid: user.uid,
                          status: user.status === "active" ? "suspended" : "active",
                        })
                      }
                    >
                      {user.status === "active" ? t("users.suspend") : t("users.activate")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUid(user.uid)}
                    >
                      {t("common:actions.edit")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setResettingUid(user.uid)}>
                      {t("users.resetPassword")}
                    </Button>
                    {!isSelf && (
                      <Button variant="destructive" size="sm" onClick={() => setDeletingUid(user.uid)}>
                        {t("common:actions.delete")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Edit user dialog */}
      <Dialog open={editingUid !== null} onOpenChange={(next) => !next && setEditingUid(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.editDialog.title", { name: editingUser?.displayName })}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t("common:fields.name")}</Label>
                <Input
                  required
                  minLength={2}
                  value={editForm.displayName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("common:fields.phone")}</Label>
                <Input
                  type="tel"
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("createUserDialog.usernameLabel")}</Label>
              <Input
                value={editForm.username ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>

            {(editingUser?.role === "admin" || editingUser?.role === "manager" || editingUser?.role === "staff") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("createUserDialog.employeeIdLabel")}</Label>
                  <Input
                    value={editForm.employeeId ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, employeeId: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("createUserDialog.departmentLabel")}</Label>
                  <Input
                    value={editForm.department ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {editingUser?.role === "supplier" && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("createUserDialog.companyNameLabel")}</Label>
                <Input
                  value={editForm.companyName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
            )}

            {editingUser?.role === "driver" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("createUserDialog.vehicleTypeLabel")}</Label>
                  <Input
                    value={editForm.vehicleType ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("createUserDialog.licensePlateLabel")}</Label>
                  <Input
                    value={editForm.licensePlate ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, licensePlate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("common:actions.saving") : t("common:actions.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingUid !== null} onOpenChange={(next) => !next && setDeletingUid(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.deleteDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("users.deleteDialog.body", {
              name: deletingUser?.displayName,
              email: deletingUser?.email,
            })}
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingUid && deleteMutation.mutate(deletingUid)}
            >
              {deleteMutation.isPending ? t("users.deleteDialog.deleting") : t("users.deleteDialog.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resettingUid !== null} onOpenChange={(next) => !next && setResettingUid(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.resetPasswordDialog.title")}</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder={t("users.resetPasswordDialog.placeholder")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              onClick={() => resetPasswordMutation.mutate()}
            >
              {resetPasswordMutation.isPending
                ? t("users.resetPasswordDialog.resetting")
                : t("users.resetPasswordDialog.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewingUid !== null} onOpenChange={(next) => !next && setViewingUid(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("users.viewDialog.title")}</DialogTitle>
          </DialogHeader>
          {isLoadingViewingUser && <p className="text-sm text-muted-foreground">{t("common:actions.loading")}</p>}
          {viewingUser && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={viewingUser.photoURL} />
                  <AvatarFallback>{initials(viewingUser.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{viewingUser.displayName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {t(`common:roles.${viewingUser.role}`)}
                    </Badge>
                    <Badge variant={viewingUser.status === "active" ? "success" : "destructive"}>
                      {t(`common:status.${viewingUser.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("common:fields.email")}</p>
                  <p>{viewingUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("users.viewDialog.username")}</p>
                  <p>{viewingUser.username ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("common:fields.phone")}</p>
                  <p>{viewingUser.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("users.viewDialog.memberSince")}</p>
                  <p>{formatDate(viewingUser.createdAt)}</p>
                </div>
              </div>

              {viewingUser.role === "customer" &&
                viewingUser.profile &&
                (() => {
                  const p = viewingUser.profile as CustomerProfile;
                  return (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-sm font-medium">{t("users.viewDialog.customerDetails")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.walletBalance")}</p>
                          <p>${p.walletBalance.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.loyaltyPoints")}</p>
                          <p>{p.loyaltyPoints}</p>
                        </div>
                      </div>
                      {p.addresses.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground">{t("users.viewDialog.addresses")}</p>
                          <ul className="mt-1 flex flex-col gap-1 text-sm">
                            {p.addresses.map((a, i) => (
                              <li key={i}>
                                {a.label}: {a.line1}
                                {a.line2 ? `, ${a.line2}` : ""}, {a.city}
                                {i === p.defaultAddressIndex && (
                                  <Badge variant="secondary" className="ms-2">
                                    {t("users.viewDialog.default")}
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {viewingUser.role === "supplier" &&
                viewingUser.profile &&
                (() => {
                  const p = viewingUser.profile as SupplierProfile;
                  return (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-sm font-medium">{t("users.viewDialog.supplierDetails")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.companyName")}</p>
                          <p>{p.companyName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.taxId")}</p>
                          <p>{p.taxId ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.rating")}</p>
                          <p>{p.rating != null ? p.rating.toFixed(1) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.categoriesSupplied")}</p>
                          <p>{p.categoriesSupplied.length > 0 ? p.categoriesSupplied.join(", ") : "—"}</p>
                        </div>
                      </div>
                      {p.bankDetails && (
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground">{t("users.viewDialog.bankDetails")}</p>
                          <p className="text-sm">
                            {p.bankDetails.bankName} · {p.bankDetails.accountNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {viewingUser.role === "driver" &&
                viewingUser.profile &&
                (() => {
                  const p = viewingUser.profile as DriverProfile;
                  return (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-sm font-medium">{t("users.viewDialog.driverDetails")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.vehicleType")}</p>
                          <p>{p.vehicleType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.licensePlate")}</p>
                          <p>{p.licensePlate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.driverStatus")}</p>
                          <p className="capitalize">{p.status.replace("_", " ")}</p>
                        </div>
                        {p.currentLocation && (
                          <div>
                            <p className="text-muted-foreground">{t("users.viewDialog.lastKnownLocation")}</p>
                            <p>
                              {p.currentLocation.lat.toFixed(4)}, {p.currentLocation.lng.toFixed(4)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {(viewingUser.role === "admin" ||
                viewingUser.role === "manager" ||
                viewingUser.role === "staff") &&
                viewingUser.profile &&
                (() => {
                  const p = viewingUser.profile as StaffProfile;
                  return (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-sm font-medium">{t("users.viewDialog.staffDetails")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.employeeId")}</p>
                          <p>{p.employeeId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("users.viewDialog.department")}</p>
                          <p>{p.department ?? "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
