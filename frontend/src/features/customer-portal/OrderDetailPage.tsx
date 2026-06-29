import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getMyInvoice, getMyOrder, getMyReceipt } from "@/api/customer.api";
import {
  confirmDelivery,
  getDeliveryByOrder,
  listIssuesForDelivery,
  reportDeliveryIssue,
} from "@/api/delivery.api";
import { getApiErrorMessage } from "@/api/client";
import { StarRating } from "@/components/shared/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OrderDetailPage() {
  const { t } = useTranslation(["customerPortal", "common"]);
  const { id } = useParams<{ id: string }>();
  const orderId = id!;
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const { data: order } = useQuery({ queryKey: ["myOrder", orderId], queryFn: () => getMyOrder(orderId) });
  const { data: invoice } = useQuery({
    queryKey: ["myInvoice", orderId],
    queryFn: () => getMyInvoice(orderId),
  });
  const { data: receipt } = useQuery({
    queryKey: ["myReceipt", orderId],
    queryFn: () => getMyReceipt(orderId),
  });
  const { data: delivery } = useQuery({
    queryKey: ["myDelivery", orderId],
    queryFn: () => getDeliveryByOrder(orderId),
    retry: false,
    throwOnError: false,
  });
  const { data: issues } = useQuery({
    queryKey: ["myDeliveryIssues", delivery?.id],
    queryFn: () => listIssuesForDelivery(delivery!.id),
    enabled: !!delivery,
  });
  const latestIssue = issues?.[0];

  const reportMutation = useMutation({
    mutationFn: () => reportDeliveryIssue(delivery!.id, description),
    onSuccess: () => {
      toast.success(t("orderDetailPage.toasts.issueReported"));
      setReportOpen(false);
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["myDeliveryIssues", delivery?.id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmDelivery(delivery!.id, selectedRating),
    onSuccess: () => {
      toast.success(t("orderDetailPage.toasts.deliveryConfirmed"));
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["myDelivery", orderId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!order) {
    return <p className="text-muted-foreground">{t("orderDetailPage.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("orderDetailPage.orderTitle", { orderNumber: order.orderNumber })}
          </h1>
          <p className="text-muted-foreground">
            {t("orderDetailPage.placedAt", {
              date: new Date(order.createdAt._seconds * 1000).toLocaleString(),
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.fulfillmentType && <Badge variant="info">{order.fulfillmentType}</Badge>}
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                  ? "warning"
                  : "destructive"
            }
          >
            {t(`common:status.${order.status}`)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("orderDetailPage.items.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orderDetailPage.items.columnProduct")}</TableHead>
                <TableHead>{t("orderDetailPage.items.columnQty")}</TableHead>
                <TableHead>{t("orderDetailPage.items.columnUnitPrice")}</TableHead>
                <TableHead className="text-end">{t("orderDetailPage.items.columnLineTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-end">${item.lineTotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ms-auto mt-4 flex w-64 flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orderDetailPage.summary.subtotal")}</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orderDetailPage.summary.discount")}</span>
              <span>-${order.discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orderDetailPage.summary.tax")}</span>
              <span>${order.taxTotal.toFixed(2)}</span>
            </div>
            {order.fulfillmentType === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orderDetailPage.summary.deliveryFee")}</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>{t("orderDetailPage.summary.total")}</span>
              <span>${order.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {delivery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("orderDetailPage.delivery.title")}
              <Badge
                variant={
                  delivery.status === "delivered"
                    ? "success"
                    : delivery.status === "failed"
                      ? "destructive"
                      : delivery.status === "unassigned"
                        ? "warning"
                        : "info"
                }
              >
                {delivery.status.replace("_", " ")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("orderDetailPage.delivery.deliveringTo", {
                address: `${delivery.dropoffAddress.line1}, ${delivery.dropoffAddress.city}`,
              })}
            </p>

            {delivery.status === "delivered" && (
              <div className="flex items-center justify-between text-sm">
                {delivery.customerConfirmedAt ? (
                  <>
                    <span className="text-muted-foreground">
                      {t("orderDetailPage.delivery.confirmedReceipt")}
                    </span>
                    <StarRating value={delivery.rating ?? 0} />
                  </>
                ) : (
                  <Button size="sm" className="self-start" onClick={() => setConfirmOpen(true)}>
                    {t("orderDetailPage.delivery.iReceivedDelivery")}
                  </Button>
                )}
              </div>
            )}

            {latestIssue ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("orderDetailPage.delivery.issueReported", {
                    description: latestIssue.description,
                  })}
                </span>
                <Badge variant={latestIssue.status === "open" ? "warning" : "success"}>
                  {latestIssue.status}
                </Badge>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setReportOpen(true)}>
                {t("orderDetailPage.delivery.reportAnIssue")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("orderDetailPage.invoice.title", { invoiceNumber: invoice?.invoiceNumber })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("orderDetailPage.invoice.summary", {
              status: invoice?.status,
              total: `$${invoice?.grandTotal.toFixed(2)}`,
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("orderDetailPage.receipt.title", { receiptNumber: receipt?.receiptNumber })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("orderDetailPage.receipt.summary", {
              amount: `$${receipt?.amountPaid.toFixed(2)}`,
              method: receipt?.paymentMethod.replace("_", " "),
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("orderDetailPage.reportDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("orderDetailPage.reportDialog.description")}
          </p>
          <Textarea
            placeholder={t("orderDetailPage.reportDialog.placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={reportMutation.isPending || description.trim().length < 5}
              onClick={() => reportMutation.mutate()}
            >
              {reportMutation.isPending
                ? t("orderDetailPage.reportDialog.sending")
                : t("orderDetailPage.reportDialog.sendReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) setSelectedRating(0);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("orderDetailPage.confirmDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("orderDetailPage.confirmDialog.description")}
          </p>
          <div className="flex justify-center py-2">
            <StarRating value={selectedRating} onChange={setSelectedRating} size="lg" />
          </div>
          <DialogFooter>
            <Button
              disabled={confirmMutation.isPending || selectedRating === 0}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending
                ? t("orderDetailPage.confirmDialog.submitting")
                : t("orderDetailPage.confirmDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
