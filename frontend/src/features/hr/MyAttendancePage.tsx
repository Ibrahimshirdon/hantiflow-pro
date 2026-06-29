import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut } from "lucide-react";
import { listAttendance, recordAttendance } from "@/api/hr.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT = {
  present: "success",
  late: "warning",
  half_day: "warning",
  leave: "info",
  absent: "destructive",
} as const;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function MyAttendancePage() {
  const { t } = useTranslation(["hr", "common"]);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: records } = useQuery({
    queryKey: ["attendance", "mine"],
    queryFn: () => listAttendance({ dateFrom: isoDaysAgo(13), dateTo: today }),
  });

  const todayRecord = useMemo(() => records?.find((r) => r.date === today), [records, today]);
  const history = useMemo(
    () => (records ?? []).filter((r) => r.date !== today),
    [records, today],
  );

  const mutation = useMutation({
    mutationFn: () =>
      recordAttendance({ staffId: profile!.uid, date: today, status: "present" }),
    onSuccess: () => {
      toast.success(
        todayRecord ? t("myAttendancePage.toasts.checkedOut") : t("myAttendancePage.toasts.checkedIn"),
      );
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("myAttendancePage.title")}</h1>
        <p className="text-muted-foreground">{t("myAttendancePage.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("myAttendancePage.todayCard.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!todayRecord ? (
            <p className="text-sm text-muted-foreground">{t("myAttendancePage.notCheckedIn")}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[todayRecord.status]}>
                {t(`attendancePage.status.${todayRecord.status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("myAttendancePage.checkedInAt", { time: todayRecord.checkIn })}
                {todayRecord.checkOut &&
                  ` · ${t("myAttendancePage.checkedOutAt", { time: todayRecord.checkOut })}`}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              disabled={!!todayRecord || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <LogIn className="size-4" />
              {t("myAttendancePage.checkIn")}
            </Button>
            <Button
              variant="outline"
              disabled={!todayRecord || !!todayRecord?.checkOut || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <LogOut className="size-4" />
              {t("myAttendancePage.checkOut")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("myAttendancePage.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:fields.date")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("attendancePage.columns.checkIn")}</TableHead>
                <TableHead>{t("attendancePage.columns.checkOut")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("myAttendancePage.historyEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[record.status]}>
                        {t(`attendancePage.status.${record.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.checkIn ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{record.checkOut ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
