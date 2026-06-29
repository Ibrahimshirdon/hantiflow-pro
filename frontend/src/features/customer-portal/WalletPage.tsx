import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wallet as WalletIcon } from "lucide-react";
import { getMyWallet, listMyOrders } from "@/api/customer.api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function WalletPage() {
  const { t } = useTranslation(["customerPortal"]);
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useQuery({ queryKey: ["myWallet"], queryFn: getMyWallet });
  const { data: orders } = useQuery({ queryKey: ["myOrders"], queryFn: listMyOrders });

  const orderNumberById = useMemo(
    () => new Map((orders ?? []).map((o) => [o.id, o.orderNumber])),
    [orders],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("walletPage.title")}</h1>
        <p className="text-muted-foreground">{t("walletPage.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <WalletIcon className="size-4.5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("walletPage.currentBalance")}</p>
            <p className="text-2xl font-semibold">
              {isLoading ? "..." : `$${wallet?.walletBalance.toFixed(2)}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("walletPage.columnDate")}</TableHead>
            <TableHead>{t("walletPage.columnType")}</TableHead>
            <TableHead>{t("walletPage.columnReason")}</TableHead>
            <TableHead>{t("walletPage.columnOrder")}</TableHead>
            <TableHead>{t("walletPage.columnBy")}</TableHead>
            <TableHead>{t("walletPage.columnAmount")}</TableHead>
            <TableHead className="text-end">{t("walletPage.columnBalanceAfter")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallet?.transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t("walletPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {wallet?.transactions.map((tx) => {
            const orderNumber = tx.relatedOrderId ? orderNumberById.get(tx.relatedOrderId) : undefined;
            const clickable = tx.relatedOrderId != null;
            return (
              <TableRow
                key={tx.id}
                className={clickable ? "cursor-pointer" : undefined}
                onClick={() => clickable && navigate(`/portal/orders/${tx.relatedOrderId}`)}
              >
                <TableCell>{new Date(tx.createdAt._seconds * 1000).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={tx.type === "credit" ? "success" : "secondary"}>{tx.type}</Badge>
                </TableCell>
                <TableCell className="capitalize">{tx.reason.replace("_", " ")}</TableCell>
                <TableCell>
                  {clickable ? (
                    <span className="text-primary hover:underline">
                      {orderNumber ?? t("walletPage.viewOrder")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("walletPage.noValue")}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.performedByName ?? t("walletPage.noValue")}
                </TableCell>
                <TableCell className={tx.type === "credit" ? "text-success" : "text-destructive"}>
                  {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-end">${tx.balanceAfter.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
