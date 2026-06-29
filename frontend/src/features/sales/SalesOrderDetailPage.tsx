import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getInvoiceForOrder, getReceiptForOrder, getSalesOrder } from "@/api/sales.api";
import type { Receipt, SalesOrder } from "@/types/sales.types";
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

export function SalesOrderDetailPage() {
  const { t } = useTranslation(["sales", "common"]);
  const { id } = useParams<{ id: string }>();
  const orderId = id!;

  const { data: order } = useQuery({
    queryKey: ["salesOrder", orderId],
    queryFn: () => getSalesOrder(orderId),
  });
  const { data: invoice } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: () => getInvoiceForOrder(orderId),
  });
  const { data: receipt } = useQuery({
    queryKey: ["receipt", orderId],
    queryFn: () => getReceiptForOrder(orderId),
  });

  if (!order) {
    return <p className="text-muted-foreground">{t("common:actions.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("salesOrderDetailPage.orderHeading", { orderNumber: order.orderNumber })}
          </h1>
          <p className="text-muted-foreground">
            {order.customerName ?? t("posPage.walkInCustomer")} ·{" "}
            {new Date(order.createdAt._seconds * 1000).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("salesOrderDetailPage.soldBy", { name: order.createdByName })}{" "}
            <span className="capitalize">({order.createdByRole})</span>
            {order.completedByName && (
              <> · {t("salesOrderDetailPage.completedBy", { name: order.completedByName })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.fulfillmentType && <Badge variant="secondary">{order.fulfillmentType}</Badge>}
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                  ? "warning"
                  : "destructive"
            }
          >
            {order.status}
          </Badge>
          <Button variant="outline" onClick={() => window.print()}>
            {t("common:actions.print")}
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t("salesOrderDetailPage.items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("salesOrderDetailPage.columns.product")}</TableHead>
                <TableHead>{t("salesOrderDetailPage.columns.qty")}</TableHead>
                <TableHead>{t("salesOrderDetailPage.columns.unitPrice")}</TableHead>
                <TableHead>{t("common:fields.discount")}</TableHead>
                <TableHead>{t("salesOrderDetailPage.columns.taxRate")}</TableHead>
                <TableHead className="text-end">{t("salesOrderDetailPage.columns.lineTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>${item.discountAmount.toFixed(2)}</TableCell>
                  <TableCell>{(item.taxRate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-end">${item.lineTotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ms-auto mt-4 flex w-64 flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.subtotal")}</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.discount")}</span>
              <span>-${order.discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.tax")}</span>
              <span>${order.taxTotal.toFixed(2)}</span>
            </div>
            {order.fulfillmentType === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("salesOrderDetailPage.deliveryFee")}</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>{t("salesOrderDetailPage.grandTotal")}</span>
              <span>${order.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("salesOrderDetailPage.invoiceHeading", { invoiceNumber: invoice?.invoiceNumber })}
              {invoice?.status && (
                <Badge variant={invoice.status === "paid" ? "success" : "warning"}>{invoice.status}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("salesOrderDetailPage.invoiceStatusLine", {
              status: invoice?.status,
              total: invoice?.grandTotal.toFixed(2),
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("salesOrderDetailPage.receiptHeading", { receiptNumber: receipt?.receiptNumber })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("salesOrderDetailPage.receiptPaidLine", {
              amount: receipt?.amountPaid.toFixed(2),
              method: receipt?.paymentMethod.replace("_", " "),
            })}
          </CardContent>
        </Card>
      </div>

      <ReceiptPaper order={order} receipt={receipt} t={t} />
    </div>
  );
}

// Styled like an actual paper receipt (narrow, dashed dividers, monospace) —
// kept visible on screen as a preview of exactly what `window.print()` will
// produce, since it's the only thing left unhidden by print:hidden above
// (and by DashboardLayout's own print:hidden sidebar/header).
function ReceiptPaper({
  order,
  receipt,
  t,
}: {
  order: SalesOrder;
  receipt: Receipt | undefined;
  t: TFunction<["sales", "common"]>;
}) {
  return (
    <div className="receipt-torn-edge relative mx-auto w-full max-w-xs bg-card p-5 pb-6 font-mono text-xs shadow-md print:max-w-full print:p-0 print:pb-3 print:shadow-none">
      {order.paymentStatus === "paid" && (
        <div className="-rotate-12 absolute top-4 right-4 rounded border-2 border-success px-2 py-0.5 text-[10px] font-bold tracking-widest text-success print:top-1 print:right-1">
          {t("salesOrderDetailPage.receiptPaper.paidStamp")}
        </div>
      )}
      <div className="flex flex-col items-center gap-1 pb-3 text-center">
        <img src="/favicon.png" alt="" className="size-12 object-contain" />
        <p className="text-sm font-bold tracking-[0.2em] uppercase">HantiFlow Pro</p>
      </div>
      <div className="border-t-2 border-foreground" />
      <div className="flex flex-col gap-0.5 py-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("salesOrderDetailPage.receiptPaper.orderNo")}</span>
          <span>{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("common:fields.date")}</span>
          <span>{new Date(order.createdAt._seconds * 1000).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("salesOrderDetailPage.receiptPaper.cashier")}</span>
          <span>{order.createdByName}</span>
        </div>
        {order.customerName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("salesOrderDetailPage.receiptPaper.customer")}
            </span>
            <span>{order.customerName}</span>
          </div>
        )}
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="flex flex-col gap-2 py-3">
        {order.items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between font-medium">
              <span>{item.productName}</span>
              <span>${item.lineTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {item.quantity} × ${item.unitPrice.toFixed(2)}
              </span>
              {item.discountAmount > 0 && <span>-${item.discountAmount.toFixed(2)}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="flex flex-col gap-0.5 py-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("common:fields.subtotal")}</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("common:fields.discount")}</span>
          <span>-${order.discountTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("common:fields.tax")}</span>
          <span>${order.taxTotal.toFixed(2)}</span>
        </div>
        {order.fulfillmentType === "delivery" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("salesOrderDetailPage.deliveryFee")}</span>
            <span>${order.deliveryFee.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="border-t-2 border-foreground" />
      <div className="flex justify-between py-3 text-base font-bold tracking-wide">
        <span>{t("salesOrderDetailPage.receiptPaper.total")}</span>
        <span>${order.grandTotal.toFixed(2)}</span>
      </div>
      <div className="border-t-2 border-foreground" />
      <div className="flex flex-col gap-0.5 py-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("salesOrderDetailPage.receiptPaper.payment")}</span>
          <span className="capitalize">{order.paymentMethod.replace("_", " ")}</span>
        </div>
        {receipt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("salesOrderDetailPage.receiptPaper.paid")}</span>
            <span>${receipt.amountPaid.toFixed(2)}</span>
          </div>
        )}
        {receipt && receipt.changeGiven > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("salesOrderDetailPage.receiptPaper.change")}</span>
            <span>${receipt.changeGiven.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="flex flex-col items-center gap-0.5 pt-3 text-center text-muted-foreground">
        <p>{t("salesOrderDetailPage.receiptPaper.thankYou")}</p>
        {receipt && <p>{receipt.receiptNumber}</p>}
      </div>
    </div>
  );
}
