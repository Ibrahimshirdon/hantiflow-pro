import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listSalesOrders } from "@/api/sales.api";
import { listUsers } from "@/api/auth.api";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

const SALESPERSON_ROLES = ["admin", "manager", "staff"] as const;

export function SalesOrdersPage() {
  const { t } = useTranslation(["sales", "common"]);
  const navigate = useNavigate();
  const [createdBy, setCreatedBy] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["salesOrders", createdBy],
    queryFn: () => listSalesOrders({ createdBy: createdBy === "all" ? undefined : createdBy }),
  });
  const { data: users } = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });

  const salespeople = useMemo(
    () => users?.filter((u) => SALESPERSON_ROLES.includes(u.role as (typeof SALESPERSON_ROLES)[number])) ?? [],
    [users],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("salesOrdersPage.title")}</h1>
        <p className="text-muted-foreground">{t("salesOrdersPage.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("salesOrdersPage.soldBy")}</Label>
        <Select value={createdBy} onValueChange={setCreatedBy}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("salesOrdersPage.everyone")}</SelectItem>
            {salespeople.map((person) => (
              <SelectItem key={person.uid} value={person.uid}>
                {person.displayName} ({person.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("salesOrdersPage.columns.orderNumber")}</TableHead>
            <TableHead>{t("salesOrdersPage.columns.customer")}</TableHead>
            <TableHead>{t("salesOrdersPage.soldBy")}</TableHead>
            <TableHead>{t("salesOrdersPage.columns.completedBy")}</TableHead>
            <TableHead>{t("salesOrdersPage.columns.items")}</TableHead>
            <TableHead>{t("common:fields.total")}</TableHead>
            <TableHead>{t("salesOrdersPage.columns.payment")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead>{t("common:fields.date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && orders?.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                {t("salesOrdersPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {orders?.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/sales/orders/${order.id}`)}
            >
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>{order.customerName ?? t("salesOrdersPage.walkIn")}</TableCell>
              <TableCell>
                {order.createdByName}{" "}
                <span className="text-xs capitalize text-muted-foreground">({order.createdByRole})</span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {order.completedByName ?? "—"}
              </TableCell>
              <TableCell>{order.items.length}</TableCell>
              <TableCell>${order.grandTotal.toFixed(2)}</TableCell>
              <TableCell className="capitalize">{order.paymentMethod.replace("_", " ")}</TableCell>
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
                  {order.status}
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
