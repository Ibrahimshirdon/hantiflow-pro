import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createUser, type CreateUserByAdminInput } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_VALUES: CreateUserByAdminInput["role"][] = ["manager", "staff", "supplier", "driver", "admin"];

const emptyForm: CreateUserByAdminInput = {
  email: "",
  password: "",
  displayName: "",
  phone: "",
  username: "",
  role: "staff",
  employeeId: "",
  department: "",
  companyName: "",
  vehicleType: "",
  licensePlate: "",
};

export function CreateUserDialog() {
  const { t } = useTranslation(["auth", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateUserByAdminInput>(emptyForm);

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success(
        t("createUserDialog.toastCreated", { role: t(`common:roles.${form.role}`) }),
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm(emptyForm);
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ ...form, username: form.username || undefined });
  }

  function set<K extends keyof CreateUserByAdminInput>(key: K, value: CreateUserByAdminInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t("createUserDialog.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createUserDialog.title")}</DialogTitle>
          <DialogDescription>{t("createUserDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">{t("common:fields.role")}</Label>
            <Select value={form.role} onValueChange={(value) => set("role", value as CreateUserByAdminInput["role"])}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`common:roles.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">{t("createUserDialog.fullNameLabel")}</Label>
            <Input
              id="displayName"
              required
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("common:fields.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">{t("createUserDialog.usernameLabel")}</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("createUserDialog.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          {(form.role === "admin" || form.role === "manager" || form.role === "staff") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeId">{t("createUserDialog.employeeIdLabel")}</Label>
                <Input
                  id="employeeId"
                  value={form.employeeId}
                  onChange={(e) => set("employeeId", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">{t("createUserDialog.departmentLabel")}</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </div>
            </div>
          )}

          {form.role === "supplier" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName">{t("createUserDialog.companyNameLabel")}</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </div>
          )}

          {form.role === "driver" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vehicleType">{t("createUserDialog.vehicleTypeLabel")}</Label>
                <Input
                  id="vehicleType"
                  value={form.vehicleType}
                  onChange={(e) => set("vehicleType", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licensePlate">{t("createUserDialog.licensePlateLabel")}</Label>
                <Input
                  id="licensePlate"
                  value={form.licensePlate}
                  onChange={(e) => set("licensePlate", e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("createUserDialog.submitting") : t("createUserDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
