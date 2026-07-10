import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart2, Printer } from "lucide-react";
import { listSalesOrders } from "@/api/sales.api";
import { useAuth } from "@/context/AuthContext";
import type { SalesOrder } from "@/types/sales.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isToday(seconds: number) {
  const d = new Date(seconds * 1000);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface ShiftStats {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  byMethod: Record<string, { count: number; revenue: number }>;
}

function computeStats(orders: SalesOrder[]): ShiftStats {
  const byMethod: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  let totalItems = 0;
  for (const order of orders) {
    totalRevenue = round2(totalRevenue + order.grandTotal);
    totalItems += order.items.reduce((s, i) => s + i.quantity, 0);
    const m = order.paymentMethod;
    if (!byMethod[m]) byMethod[m] = { count: 0, revenue: 0 };
    byMethod[m]!.count++;
    byMethod[m]!.revenue = round2(byMethod[m]!.revenue + order.grandTotal);
  }
  return { totalOrders: orders.length, totalRevenue, totalItems, byMethod };
}

interface SummaryContentProps {
  stats: ShiftStats;
  cashier: string;
  date: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function SummaryContent({ stats, cashier, date, t }: SummaryContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
        <span>{t("posPage.shiftSummary.cashier", { name: cashier })}</span>
        <span>{date}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
          <p className="text-xs text-muted-foreground">{t("posPage.shiftSummary.totalOrders")}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{t("posPage.shiftSummary.totalRevenue")}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-2xl font-bold">{stats.totalItems}</p>
          <p className="text-xs text-muted-foreground">{t("posPage.shiftSummary.totalItems")}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("posPage.shiftSummary.paymentMethod")}</TableHead>
            <TableHead className="text-center">{t("posPage.shiftSummary.orders")}</TableHead>
            <TableHead className="text-end">{t("posPage.shiftSummary.amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(stats.byMethod).map(([method, data]) => (
            <TableRow key={method}>
              <TableCell className="capitalize font-medium">
                {method.replace(/_/g, " ")}
              </TableCell>
              <TableCell className="text-center">{data.count}</TableCell>
              <TableCell className="text-end">${data.revenue.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          {stats.totalOrders === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                {t("posPage.shiftSummary.noOrders")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function ShiftSummaryDialog() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation(["sales", "common"]);
  const { profile } = useAuth();

  const { data: allMyOrders, isLoading } = useQuery({
    queryKey: ["salesOrders", "shiftSummary", profile?.uid],
    queryFn: () => listSalesOrders({ createdBy: profile!.uid }),
    enabled: open && !!profile,
  });

  const todayOrders = useMemo(
    () =>
      (allMyOrders ?? []).filter(
        (o) => o.status === "completed" && isToday(o.createdAt._seconds),
      ),
    [allMyOrders],
  );

  const stats = useMemo(() => computeStats(todayOrders), [todayOrders]);

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    setOpen(false);
    setTimeout(() => window.print(), 100);
  };

  return (
    <>
      {/* Print-only version — hidden on screen, visible when window.print() fires */}
      <div className="hidden print:block p-8 font-mono text-sm">
        <h1 className="mb-1 text-center text-lg font-bold uppercase tracking-widest">
          {t("posPage.shiftSummary.title")}
        </h1>
        <p className="mb-4 text-center text-xs text-gray-500">{dateStr}</p>
        <SummaryContent
          stats={stats}
          cashier={profile?.displayName ?? ""}
          date={dateStr}
          t={t as (key: string, opts?: Record<string, unknown>) => string}
        />
      </div>

      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BarChart2 className="me-1.5 size-4" />
        {t("posPage.shiftSummary.button")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle>{t("posPage.shiftSummary.title")}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("common:actions.loading")}
            </p>
          ) : (
            <SummaryContent
              stats={stats}
              cashier={profile?.displayName ?? ""}
              date={dateStr}
              t={t as (key: string, opts?: Record<string, unknown>) => string}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common:actions.close")}
            </Button>
            <Button onClick={handlePrint} disabled={stats.totalOrders === 0}>
              <Printer className="me-1.5 size-4" />
              {t("common:actions.print")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
