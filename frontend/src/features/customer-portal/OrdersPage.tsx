import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listMyOrders } from "@/api/customer.api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OrdersPage() {
  const { t } = useTranslation(["customerPortal", "common"]);
  const navigate = useNavigate();
  const { data: orders, isLoading } = useQuery({ queryKey: ["myOrders"], queryFn: listMyOrders });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("ordersPage.title")}</h1>
        <p className="text-muted-foreground">{t("ordersPage.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("ordersPage.columnOrderNumber")}</TableHead>
            <TableHead>{t("ordersPage.columnItems")}</TableHead>
            <TableHead>{t("ordersPage.columnTotal")}</TableHead>
            <TableHead>{t("ordersPage.columnStatus")}</TableHead>
            <TableHead>{t("ordersPage.columnDate")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("ordersPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && orders?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("ordersPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {orders?.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => navigate(`/portal/orders/${order.id}`)}
            >
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>{order.items.length}</TableCell>
              <TableCell>${order.grandTotal.toFixed(2)}</TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>{new Date(order.createdAt._seconds * 1000).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
