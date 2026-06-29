import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PackageCheck, Percent, XCircle, type LucideIcon } from "lucide-react";
import { listDeliveries } from "@/api/delivery.api";
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

const DONE_STATUSES = ["delivered", "failed"];

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
      <CardContent className="flex flex-col gap-2 p-3">
        {Icon && (
          <div className={`flex size-7 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="size-3.5" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DriverHistoryPage() {
  const { t } = useTranslation(["driverPortal"]);
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries", "mine"],
    queryFn: () => listDeliveries(),
  });
  const past = deliveries?.filter((d) => DONE_STATUSES.includes(d.status)) ?? [];
  const totalDelivered = deliveries?.filter((d) => d.status === "delivered").length ?? 0;
  const totalFailed = deliveries?.filter((d) => d.status === "failed").length ?? 0;
  const successRate =
    totalDelivered + totalFailed > 0
      ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("historyPage.title")}</h1>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={t("historyPage.stats.totalDelivered")}
          value={String(totalDelivered)}
          icon={PackageCheck}
          tone="success"
        />
        <StatCard
          label={t("historyPage.stats.totalFailed")}
          value={String(totalFailed)}
          icon={XCircle}
          tone="warning"
        />
        <StatCard
          label={t("historyPage.stats.successRate")}
          value={`${successRate}%`}
          icon={Percent}
          tone="primary"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("historyPage.table.orderNumber")}</TableHead>
            <TableHead>{t("historyPage.table.dropoff")}</TableHead>
            <TableHead>{t("historyPage.table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("historyPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && past.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("historyPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {past.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium">{delivery.orderNumber}</TableCell>
              <TableCell>
                {delivery.dropoffAddress.line1}, {delivery.dropoffAddress.city}
              </TableCell>
              <TableCell>
                <Badge variant={delivery.status === "delivered" ? "success" : "destructive"}>
                  {t(`statuses.${delivery.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
