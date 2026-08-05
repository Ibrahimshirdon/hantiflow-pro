import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ScanFace, UserRound } from "lucide-react";
import { listUsers } from "@/api/auth.api";
import { deleteFaceEnrollment, listFaceEnrollments } from "@/api/hr.api";
import type { FaceEnrollment } from "@/types/hr.types";
import { getApiErrorMessage } from "@/api/client";
import type { UserProfile } from "@/types/auth.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaceEnrollDialog } from "./FaceEnrollDialog";

const ELIGIBLE_ROLES = ["staff", "manager", "driver"];

export function FaceEnrollmentPage() {
  const { t } = useTranslation(["hr", "common"]);
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState<UserProfile | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => listUsers(),
  });
  const { data: enrollments } = useQuery({
    queryKey: ["faceEnrollments"],
    queryFn: listFaceEnrollments,
  });

  const eligibleStaff = useMemo(
    () => (users ?? []).filter((u) => ELIGIBLE_ROLES.includes(u.role)),
    [users],
  );
  const enrollmentByStaffId = useMemo(() => {
    const map = new Map<string, FaceEnrollment>();
    enrollments?.forEach((e) => map.set(e.staffId, e));
    return map;
  }, [enrollments]);

  const removeMutation = useMutation({
    mutationFn: (staffId: string) => deleteFaceEnrollment(staffId),
    onSuccess: () => {
      toast.success(t("hr:faceEnrollmentPage.toasts.removed"));
      queryClient.invalidateQueries({ queryKey: ["faceEnrollments"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("hr:faceEnrollmentPage.title")}</h1>
        <p className="text-muted-foreground">{t("hr:faceEnrollmentPage.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("hr:faceEnrollmentPage.columns.photo")}</TableHead>
            <TableHead>{t("common:fields.name")}</TableHead>
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
          {!isLoading && eligibleStaff.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("hr:faceEnrollmentPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {eligibleStaff.map((user) => {
            const enrollment = enrollmentByStaffId.get(user.uid);
            const isEnrolled = !!enrollment;
            return (
              <TableRow key={user.uid}>
                <TableCell>
                  {enrollment?.photoUrl ? (
                    <img
                      src={enrollment.photoUrl}
                      alt={user.displayName}
                      className="size-10 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full border bg-muted">
                      <UserRound className="size-5 text-muted-foreground/50" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {t(`common:roles.${user.role}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isEnrolled ? (
                    <Badge variant="success">{t("hr:faceEnrollmentPage.enrolled")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("hr:faceEnrollmentPage.notEnrolled")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEnrolling(user)}>
                      <ScanFace className="size-4" />
                      {isEnrolled ? t("hr:faceEnrollmentPage.reEnroll") : t("hr:faceEnrollmentPage.enroll")}
                    </Button>
                    {isEnrolled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(user.uid)}
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

      {enrolling && (
        <FaceEnrollDialog
          open={!!enrolling}
          onOpenChange={(next) => !next && setEnrolling(null)}
          staffId={enrolling.uid}
          staffName={enrolling.displayName}
        />
      )}
    </div>
  );
}
