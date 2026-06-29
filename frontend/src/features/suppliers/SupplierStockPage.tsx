import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  approveSupplierSubmission,
  createStockRequest,
  listStockRequests,
  listSupplierProducts,
  listSupplierSubmissions,
  rejectSupplierSubmission,
} from "@/api/supplier.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { SupplierProduct, SupplierSubmission } from "@/types/supplier.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function SupplierStockPage() {
  const { t } = useTranslation(["suppliers", "common"]);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canReview = profile?.role === "admin" || profile?.role === "manager";
  const [requesting, setRequesting] = useState<SupplierProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [rejecting, setRejecting] = useState<SupplierSubmission | null>(null);
  const [reason, setReason] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["supplierProducts", "all"],
    queryFn: () => listSupplierProducts(),
  });
  const { data: stockRequests } = useQuery({
    queryKey: ["stockRequests", "all"],
    queryFn: () => listStockRequests(),
  });
  const { data: submissions } = useQuery({
    queryKey: ["supplierSubmissions", "all"],
    queryFn: () => listSupplierSubmissions(),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      createStockRequest({
        supplierProductId: requesting!.id,
        quantity,
        message: message || undefined,
      }),
    onSuccess: () => {
      toast.success(t("toasts.requestSent"));
      queryClient.invalidateQueries({ queryKey: ["stockRequests"] });
      setRequesting(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const approveSubmissionMutation = useMutation({
    mutationFn: (id: string) => approveSupplierSubmission(id),
    onSuccess: () => {
      toast.success(t("toasts.submissionApproved"));
      queryClient.invalidateQueries({ queryKey: ["supplierSubmissions"] });
      queryClient.invalidateQueries({ queryKey: ["supplierProducts"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rejectSubmissionMutation = useMutation({
    mutationFn: () => rejectSupplierSubmission(rejecting!.id, { reason: reason || undefined }),
    onSuccess: () => {
      toast.success(t("toasts.submissionRejected"));
      queryClient.invalidateQueries({ queryKey: ["supplierSubmissions"] });
      setRejecting(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openRequest(product: SupplierProduct) {
    setQuantity(Math.min(1, product.quantityInStock));
    setMessage("");
    setRequesting(product);
  }

  function openReject(submission: SupplierSubmission) {
    setReason("");
    setRejecting(submission);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("stockPage.title")}</h1>
        <p className="text-muted-foreground">{t("stockPage.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("stockPage.table.product")}</TableHead>
            <TableHead>{t("stockPage.table.company")}</TableHead>
            <TableHead>{t("stockPage.table.supplier")}</TableHead>
            <TableHead>{t("stockPage.table.manager")}</TableHead>
            <TableHead>{t("stockPage.table.category")}</TableHead>
            <TableHead>{t("stockPage.table.available")}</TableHead>
            <TableHead>{t("stockPage.table.unit")}</TableHead>
            <TableHead>{t("stockPage.table.wholesalePrice")}</TableHead>
            <TableHead>{t("stockPage.table.sellingPrice")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && products?.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                {t("stockPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {products
            ?.filter((p) => p.isActive)
            .map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                </TableCell>
                <TableCell>{product.companyName}</TableCell>
                <TableCell>{product.supplierName}</TableCell>
                <TableCell>{product.companyManagerName}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.quantityInStock}</TableCell>
                <TableCell className="text-muted-foreground">{product.unitType}</TableCell>
                <TableCell>${product.wholesalePrice.toFixed(2)}</TableCell>
                <TableCell>${product.sellingPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={product.linkedProductId ? "success" : "warning"}>
                    {product.linkedProductId ? t("stockPage.inCatalog") : t("stockPage.notYetSubmitted")}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={product.quantityInStock <= 0}
                    onClick={() => openRequest(product)}
                  >
                    {t("stockPage.requestStock")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("stockPage.requestsCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stockPage.table.product")}</TableHead>
                <TableHead>{t("common:fields.quantity")}</TableHead>
                <TableHead>{t("stockPage.requestsCard.requestedBy")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("common:fields.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!stockRequests || stockRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("stockPage.requestsCard.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                stockRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.productName}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.requestedByName}{" "}
                      <span className="text-xs capitalize">({request.requestedByRole})</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[request.status]}>
                        {t(`common:status.${request.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.createdAt._seconds * 1000).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("stockPage.submissionsCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stockPage.table.product")}</TableHead>
                <TableHead>{t("stockPage.table.supplier")}</TableHead>
                <TableHead>{t("common:fields.quantity")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("common:fields.date")}</TableHead>
                {canReview && <TableHead className="text-end">{t("common:fields.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!submissions || submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canReview ? 6 : 5} className="text-center text-muted-foreground">
                    {t("stockPage.submissionsCard.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{submission.supplierName}</TableCell>
                    <TableCell>{submission.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[submission.status]}>
                        {t(`common:status.${submission.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(submission.createdAt._seconds * 1000).toLocaleDateString()}
                    </TableCell>
                    {canReview && (
                      <TableCell className="text-end">
                        {submission.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={approveSubmissionMutation.isPending}
                              onClick={() => approveSubmissionMutation.mutate(submission.id)}
                            >
                              {t("common:actions.approve")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openReject(submission)}>
                              {t("common:actions.reject")}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejecting !== null} onOpenChange={(next) => !next && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("stockPage.submissionsRejectDialog.title", { name: rejecting?.productName })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>{t("stockPage.submissionsRejectDialog.reasonLabel")}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={rejectSubmissionMutation.isPending}
              onClick={() => rejectSubmissionMutation.mutate()}
            >
              {rejectSubmissionMutation.isPending
                ? t("stockPage.submissionsRejectDialog.rejecting")
                : t("stockPage.submissionsRejectDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requesting !== null} onOpenChange={(next) => !next && setRequesting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("stockPage.dialog.title", { name: requesting?.name })}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                {t("stockPage.dialog.quantityLabel", { count: requesting?.quantityInStock ?? 0 })}
              </Label>
              <Input
                type="number"
                min={1}
                max={requesting?.quantityInStock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("stockPage.dialog.messageLabel")}</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={requestMutation.isPending || quantity <= 0}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? t("stockPage.dialog.sending") : t("stockPage.dialog.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
