import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { approveStockRequest, listStockRequests, rejectStockRequest } from "@/api/supplier.api";
import { getApiErrorMessage } from "@/api/client";
import { toDate } from "@/types/inventory.types";
import type { StockRequest } from "@/types/supplier.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const;

export function StockRequestsPage() {
  const { t } = useTranslation(["supplierPortal", "common"]);
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<StockRequest | null>(null);
  const [reason, setReason] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["stockRequests"],
    queryFn: () => listStockRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveStockRequest(id),
    onSuccess: () => {
      toast.success(t("stockRequestsPage.toasts.approved"));
      queryClient.invalidateQueries({ queryKey: ["stockRequests"] });
      queryClient.invalidateQueries({ queryKey: ["supplierProducts"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectStockRequest(rejecting!.id, { reason: reason || undefined }),
    onSuccess: () => {
      toast.success(t("stockRequestsPage.toasts.rejected"));
      queryClient.invalidateQueries({ queryKey: ["stockRequests"] });
      setRejecting(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openReject(request: StockRequest) {
    setReason("");
    setRejecting(request);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("stockRequestsPage.title")}</h1>
        <p className="text-muted-foreground">{t("stockRequestsPage.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("stockRequestsPage.table.product")}</TableHead>
            <TableHead>{t("stockRequestsPage.table.company")}</TableHead>
            <TableHead>{t("common:fields.quantity")}</TableHead>
            <TableHead>{t("stockRequestsPage.table.requestedBy")}</TableHead>
            <TableHead>{t("stockRequestsPage.table.message")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead>{t("common:fields.date")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && requests?.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t("stockRequestsPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {requests?.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.productName}</TableCell>
              <TableCell>{request.companyName}</TableCell>
              <TableCell>{request.quantity}</TableCell>
              <TableCell className="text-muted-foreground">{request.requestedByName}</TableCell>
              <TableCell className="text-muted-foreground">{request.message ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[request.status]}>
                  {t(`common:status.${request.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {toDate(request.createdAt)?.toLocaleDateString() ?? "—"}
              </TableCell>
              <TableCell className="text-end">
                {request.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(request.id)}
                    >
                      {t("common:actions.approve")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReject(request)}>
                      {t("common:actions.reject")}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={rejecting !== null} onOpenChange={(next) => !next && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("stockRequestsPage.rejectDialog.title", { name: rejecting?.productName })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>{t("stockRequestsPage.rejectDialog.reasonLabel")}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
            >
              {rejectMutation.isPending
                ? t("stockRequestsPage.rejectDialog.rejecting")
                : t("stockRequestsPage.rejectDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
