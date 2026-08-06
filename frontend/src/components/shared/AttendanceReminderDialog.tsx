import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ScanFace } from "lucide-react";
import { listAttendance, recordAttendance } from "@/api/hr.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mounted once in DashboardLayout, so it's evaluated on every fresh page
// load (a reasonable cadence to keep nudging someone who genuinely hasn't
// checked in yet) but only once per mount within a session — dismissing it
// doesn't bring it back until the next full load, so it's a nudge rather
// than a nag.
export function AttendanceReminderDialog() {
  const { t } = useTranslation(["hr", "common"]);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Self check-in/out (and therefore this reminder) only exists for the
  // "staff" role — see attendance.service.ts's recordAttendance, which
  // only treats "staff" callers as self-service.
  const isStaff = profile?.role === "staff";

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", "mine", today],
    queryFn: () => listAttendance({ staffId: profile!.uid, date: today }),
    enabled: isStaff,
  });
  const alreadyCheckedIn = (records?.length ?? 0) > 0;
  const faceOnly = profile?.attendanceMethod === "face";

  const checkInMutation = useMutation({
    mutationFn: () => recordAttendance({ staffId: profile!.uid, date: today, status: "present" }),
    onSuccess: () => {
      toast.success(t("hr:attendanceReminder.toasts.checkedIn"));
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setDismissed(true);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const open = isStaff && !isLoading && !alreadyCheckedIn && !dismissed;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setDismissed(true)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CalendarCheck className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t("hr:attendanceReminder.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">
          {faceOnly ? t("hr:attendanceReminder.faceOnlyBody") : t("hr:attendanceReminder.body")}
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {faceOnly ? (
            <Button
              className="w-full gap-2"
              onClick={() => {
                setDismissed(true);
                navigate("/app/hr/face-checkin");
              }}
            >
              <ScanFace className="size-4" />
              {t("hr:attendanceReminder.goToKiosk")}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
            >
              {checkInMutation.isPending
                ? t("common:actions.saving")
                : t("hr:attendanceReminder.checkInNow")}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => setDismissed(true)}>
            {t("hr:attendanceReminder.later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
