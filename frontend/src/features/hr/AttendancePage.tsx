import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { listUsers } from "@/api/auth.api";
import { deleteAttendance, listAttendance, recordAttendance } from "@/api/hr.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile } from "@/types/auth.types";
import type { AttendanceRecord } from "@/types/hr.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const ELIGIBLE_ROLES = ["staff", "manager", "driver"];

const STATUS_VARIANT = {
  present: "success",
  late: "warning",
  half_day: "warning",
  leave: "info",
  absent: "destructive",
} as const;

interface AttendanceForm {
  status: AttendanceRecord["status"];
  checkIn: string;
  checkOut: string;
  notes: string;
}

const EMPTY_FORM: AttendanceForm = { status: "present", checkIn: "", checkOut: "", notes: "" };

export function AttendancePage() {
  const { t } = useTranslation(["hr", "common"]);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<AttendanceForm>(EMPTY_FORM);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => listUsers(),
  });
  const { data: records } = useQuery({
    queryKey: ["attendance", date],
    queryFn: () => listAttendance({ date }),
  });

  const eligibleStaff = useMemo(
    () => (users ?? []).filter((u) => ELIGIBLE_ROLES.includes(u.role)),
    [users],
  );
  const recordByStaffId = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records?.forEach((r) => map.set(r.staffId, r));
    return map;
  }, [records]);
  const presentCount = records?.filter((r) => r.status === "present").length ?? 0;

  const recordMutation = useMutation({
    mutationFn: () =>
      recordAttendance({
        staffId: editing!.uid,
        date,
        status: form.status,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t("attendancePage.toasts.saved"));
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setEditing(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttendance(id),
    onSuccess: () => {
      toast.success(t("attendancePage.toasts.deleted"));
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openDialog(user: UserProfile) {
    const existing = recordByStaffId.get(user.uid);
    setForm(
      existing
        ? {
            status: existing.status,
            checkIn: existing.checkIn ?? "",
            checkOut: existing.checkOut ?? "",
            notes: existing.notes ?? "",
          }
        : EMPTY_FORM,
    );
    setEditing(user);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    recordMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("attendancePage.title")}</h1>
          <p className="text-muted-foreground">{t("attendancePage.subtitle")}</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">{t("common:fields.date")}</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <p className="pb-2 text-sm text-muted-foreground">
            {t("attendancePage.presentSummary", { count: presentCount, total: eligibleStaff.length })}
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("common:fields.role")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead>{t("attendancePage.columns.checkIn")}</TableHead>
            <TableHead>{t("attendancePage.columns.checkOut")}</TableHead>
            <TableHead>{t("common:fields.notes")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && eligibleStaff.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t("attendancePage.empty")}
              </TableCell>
            </TableRow>
          )}
          {eligibleStaff.map((user) => {
            const record = recordByStaffId.get(user.uid);
            return (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {t(`common:roles.${user.role}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {record ? (
                    <Badge variant={STATUS_VARIANT[record.status]}>
                      {t(`attendancePage.status.${record.status}`)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("attendancePage.status.notMarked")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{record?.checkIn ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{record?.checkOut ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{record?.notes ?? "—"}</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDialog(user)}>
                      {record ? t("common:actions.edit") : t("attendancePage.mark")}
                    </Button>
                    {record && isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(record.id)}
                      >
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

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("attendancePage.dialog.title", { name: editing?.displayName, date })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("common:fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as AttendanceRecord["status"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t("attendancePage.status.present")}</SelectItem>
                  <SelectItem value="late">{t("attendancePage.status.late")}</SelectItem>
                  <SelectItem value="half_day">{t("attendancePage.status.half_day")}</SelectItem>
                  <SelectItem value="leave">{t("attendancePage.status.leave")}</SelectItem>
                  <SelectItem value="absent">{t("attendancePage.status.absent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkIn">{t("attendancePage.columns.checkIn")}</Label>
                <Input
                  id="checkIn"
                  type="time"
                  value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkOut">{t("attendancePage.columns.checkOut")}</Label>
                <Input
                  id="checkOut"
                  type="time"
                  value={form.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t("common:fields.notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={recordMutation.isPending}>
                {recordMutation.isPending ? t("common:actions.saving") : t("attendancePage.dialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
