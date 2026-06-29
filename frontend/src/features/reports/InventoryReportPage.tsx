import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Boxes, DollarSign, type LucideIcon } from "lucide-react";
import { downloadInventoryReport, getInventoryReport } from "@/api/reports.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  purple: "bg-purple/10 text-purple",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {Icon && (
          <div className={`flex size-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="size-4.5" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryReportPage() {
  const { t } = useTranslation(["reports", "common"]);
  const { data: report, isLoading } = useQuery({
    queryKey: ["inventoryReport"],
    queryFn: getInventoryReport,
  });

  const downloadMutation = useMutation({
    mutationFn: (format: "pdf" | "excel") => downloadInventoryReport(format),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("inventoryReportPage.title")}</h1>
          <p className="text-muted-foreground">{t("inventoryReportPage.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate("pdf")}
          >
            {t("inventoryReportPage.exportPdf")}
          </Button>
          <Button
            variant="outline"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate("excel")}
          >
            {t("inventoryReportPage.exportExcel")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={t("inventoryReportPage.summary.totalProducts")}
          value={String(report?.summary.totalProducts ?? "—")}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label={t("inventoryReportPage.summary.inventoryValue")}
          value={`$${(report?.summary.totalInventoryValue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label={t("inventoryReportPage.summary.lowStockItems")}
          value={String(report?.summary.lowStockCount ?? "—")}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("inventoryReportPage.table.sku")}</TableHead>
            <TableHead>{t("inventoryReportPage.table.product")}</TableHead>
            <TableHead>{t("inventoryReportPage.table.category")}</TableHead>
            <TableHead>{t("inventoryReportPage.table.stock")}</TableHead>
            <TableHead>{t("inventoryReportPage.table.unit")}</TableHead>
            <TableHead>{t("inventoryReportPage.table.reorderLevel")}</TableHead>
            <TableHead className="text-end">{t("inventoryReportPage.table.stockValue")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
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
          {report?.rows.map((row) => (
            <TableRow key={row.sku}>
              <TableCell className="font-medium">{row.sku}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.categoryName}</TableCell>
              <TableCell>{row.totalStock}</TableCell>
              <TableCell className="text-muted-foreground">{row.unit}</TableCell>
              <TableCell>{row.reorderLevel}</TableCell>
              <TableCell className="text-end">${row.stockValue.toFixed(2)}</TableCell>
              <TableCell>
                {row.stockStatus === "low" && (
                  <Badge variant="destructive">{t("inventoryReportPage.status.low")}</Badge>
                )}
                {row.stockStatus === "warning" && (
                  <Badge variant="warning">{t("inventoryReportPage.status.warning")}</Badge>
                )}
                {row.stockStatus === "good" && (
                  <Badge variant="success">{t("inventoryReportPage.status.good")}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
