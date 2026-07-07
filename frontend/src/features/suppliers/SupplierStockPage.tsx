import { useMemo, useState } from "react";
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

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const;

function formatDate(ts: { _seconds: number } | null | undefined) {
  if (!ts) return "—";
  return new Date(ts._seconds * 1000).toLocaleDateString();
}

export function SupplierStockPage() {
  const { t } = useTranslation(["suppliers", "common"]);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // Request stock dialog state
  const [requesting, setRequesting] = useState<SupplierProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  // Filters for stock requests history
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Submission detail dialog state
  const [viewSubmission, setViewSubmission] = useState<SupplierSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["supplierProducts", "all"],
    queryFn: () => listSupplierProducts(),
  });
  const { data: stockRequests } = useQuery({
    queryKey: ["stockRequests", "all"],
    queryFn: () => listStockRequests(),
  });
  const { data: submissions } = useQuery({
    queryKey: ["supplierSubmissions"],
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

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSupplierSubmission(id),
    onSuccess: () => {
      toast.success(t("toasts.submissionApproved"));
      queryClient.invalidateQueries({ queryKey: ["supplierSubmissions"] });
      setViewSubmission(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectSupplierSubmission(id, { reason: rejectReason || undefined }),
    onSuccess: () => {
      toast.success(t("toasts.submissionRejected"));
      queryClient.invalidateQueries({ queryKey: ["supplierSubmissions"] });
      setViewSubmission(null);
      setRejectReason("");
      setShowRejectInput(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openRequest(product: SupplierProduct) {
    setQuantity(Math.min(1, product.quantityInStock));
    setMessage("");
    setRequesting(product);
  }

  function openSubmission(sub: SupplierSubmission) {
    setViewSubmission(sub);
    setRejectReason("");
    setShowRejectInput(false);
  }

  const filteredRequests = useMemo(() => {
    if (!stockRequests) return [];
    return stockRequests.filter((r) => {
      const date = new Date(r.createdAt._seconds * 1000);
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + "T23:59:59")) return false;
      if (roleFilter !== "all" && r.requestedByRole !== roleFilter) return false;
      return true;
    });
  }, [stockRequests, dateFrom, dateTo, roleFilter]);

  const pendingCount = submissions?.filter((s) => s.status === "pending").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("stockPage.title")}</h1>
        <p className="text-muted-foreground">{t("stockPage.subtitle")}</p>
      </div>

      {/* Supplier products table */}
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

      {/* Stock requests history with filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("stockPage.requestsCard.title")}</CardTitle>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterFrom")}</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterTo")}</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterRole")}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("stockPage.requestsCard.allRoles")}</SelectItem>
                    <SelectItem value="admin">{t("stockPage.requestsCard.roleAdmin")}</SelectItem>
                    <SelectItem value="manager">{t("stockPage.requestsCard.roleManager")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(dateFrom || dateTo || roleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setDateFrom(""); setDateTo(""); setRoleFilter("all"); }}
                >
                  {t("common:actions.clear")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
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
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("stockPage.requestsCard.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
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

      {/* Supplier submissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{t("stockPage.submissionsCard.title")}</CardTitle>
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stockPage.table.product")}</TableHead>
                <TableHead>{t("stockPage.table.company")}</TableHead>
                <TableHead>{t("stockPage.submissionsCard.supplier")}</TableHead>
                <TableHead>{t("common:fields.quantity")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("common:fields.date")}</TableHead>
                <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!submissions || submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t("stockPage.submissionsCard.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id} className={sub.status === "pending" ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">{sub.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.companyName}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.supplierName}</TableCell>
                    <TableCell>{sub.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[sub.status]}>
                        {t(`common:status.${sub.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sub.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="outline" onClick={() => openSubmission(sub)}>
                        {t("stockPage.submissionsCard.viewDetails")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submission detail dialog */}
      <Dialog
        open={viewSubmission !== null}
        onOpenChange={(next) => {
          if (!next) { setViewSubmission(null); setShowRejectInput(false); setRejectReason(""); }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("stockPage.submissionDialog.title")}</DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <div className="flex flex-col gap-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.product")}</span>
                  <span className="font-semibold">{viewSubmission.productName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.company")}</span>
                  <span className="font-medium">{viewSubmission.companyName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.supplier")}</span>
                  <span className="font-medium">{viewSubmission.supplierName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("common:fields.quantity")}</span>
                  <span className="font-medium">{viewSubmission.quantity}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("common:fields.status")}</span>
                  <Badge variant={STATUS_VARIANT[viewSubmission.status]} className="w-fit">
                    {t(`common:status.${viewSubmission.status}`)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.submitted")}</span>
                  <span className="font-medium">{formatDate(viewSubmission.createdAt)}</span>
                </div>
                {viewSubmission.respondedAt && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.responded")}</span>
                    <span className="font-medium">{formatDate(viewSubmission.respondedAt)}</span>
                  </div>
                )}
                {viewSubmission.resultingProductId && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{t("stockPage.submissionDialog.addedToInventory")}</span>
                    <span className="text-emerald-600 font-medium">{t("stockPage.submissionDialog.yes")}</span>
                  </div>
                )}
              </div>

              {viewSubmission.rejectionReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="text-xs font-medium text-destructive mb-1">{t("stockPage.submissionDialog.rejectionReason")}</p>
                  <p className="text-muted-foreground">{viewSubmission.rejectionReason}</p>
                </div>
              )}

              {/* Reject input */}
              {showRejectInput && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t("stockPage.submissionDialog.rejectReasonLabel")}</Label>
                  <Textarea
                    placeholder={t("stockPage.submissionDialog.rejectReasonPlaceholder")}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Admin actions for pending submissions */}
              {isAdmin && viewSubmission.status === "pending" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!showRejectInput ? (
                    <>
                      <Button
                        className="flex-1"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(viewSubmission.id)}
                      >
                        {approveMutation.isPending
                          ? t("common:actions.saving")
                          : t("stockPage.submissionDialog.approve")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setShowRejectInput(true)}
                      >
                        {t("stockPage.submissionDialog.reject")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(viewSubmission.id)}
                      >
                        {rejectMutation.isPending
                          ? t("common:actions.saving")
                          : t("stockPage.submissionDialog.confirmReject")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                      >
                        {t("common:actions.cancel")}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSubmission(null)}>
              {t("common:actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request stock dialog */}
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
