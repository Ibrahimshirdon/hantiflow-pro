import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Receipt, Users, Wallet, type LucideIcon } from "lucide-react";
import { listLoans } from "@/api/loans.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

interface CustomerLoanSummary {
  customerId: string;
  customerName: string;
  totalPrincipal: number;
  totalRepaid: number;
  totalRemaining: number;
  activeLoanCount: number;
  totalLoanCount: number;
}

export function LoansPage() {
  const { t } = useTranslation(["finance", "common"]);
  const navigate = useNavigate();
  const [viewFilter, setViewFilter] = useState("active");

  const { data: loans, isLoading } = useQuery({
    queryKey: ["loans", "all"],
    queryFn: () => listLoans(),
  });

  const customerSummaries = useMemo(() => {
    const byCustomer = new Map<string, CustomerLoanSummary>();
    (loans ?? []).forEach((loan) => {
      const existing = byCustomer.get(loan.customerId) ?? {
        customerId: loan.customerId,
        customerName: loan.customerName,
        totalPrincipal: 0,
        totalRepaid: 0,
        totalRemaining: 0,
        activeLoanCount: 0,
        totalLoanCount: 0,
      };
      existing.totalPrincipal = round2(existing.totalPrincipal + loan.principalAmount);
      existing.totalRepaid = round2(existing.totalRepaid + loan.amountRepaid);
      existing.totalRemaining = round2(existing.totalRemaining + loan.balanceRemaining);
      existing.totalLoanCount += 1;
      if (loan.status === "outstanding") existing.activeLoanCount += 1;
      byCustomer.set(loan.customerId, existing);
    });
    return Array.from(byCustomer.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [loans]);

  const visibleSummaries = useMemo(
    () =>
      viewFilter === "active"
        ? customerSummaries.filter((c) => c.activeLoanCount > 0)
        : customerSummaries,
    [customerSummaries, viewFilter],
  );

  const totalOutstanding = useMemo(
    () => round2(customerSummaries.reduce((s, c) => s + c.totalRemaining, 0)),
    [customerSummaries],
  );
  const totalActiveLoans = useMemo(
    () => customerSummaries.reduce((s, c) => s + c.activeLoanCount, 0),
    [customerSummaries],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("loansPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("loansPage.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label={t("loansPage.stats.totalOutstanding")}
          value={`$${totalOutstanding.toFixed(2)}`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label={t("loansPage.stats.customersWithLoans")}
          value={String(customerSummaries.length)}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label={t("loansPage.stats.activeLoans")}
          value={String(totalActiveLoans)}
          icon={Receipt}
          tone="purple"
        />
      </div>

      <Select value={viewFilter} onValueChange={setViewFilter}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t("loansPage.filters.activeOnly")}</SelectItem>
          <SelectItem value="all">{t("loansPage.filters.all")}</SelectItem>
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("loansPage.columns.totalLoanAmount")}</TableHead>
            <TableHead>{t("loansPage.columns.totalRepaid")}</TableHead>
            <TableHead>{t("loansPage.columns.remainingBalance")}</TableHead>
            <TableHead>{t("loansPage.columns.activeLoans")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && visibleSummaries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("loansPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {visibleSummaries.map((c) => (
            <TableRow
              key={c.customerId}
              className="cursor-pointer"
              onClick={() => navigate(`/app/finance/loans/${c.customerId}`)}
            >
              <TableCell className="font-medium">{c.customerName}</TableCell>
              <TableCell>${c.totalPrincipal.toFixed(2)}</TableCell>
              <TableCell>${c.totalRepaid.toFixed(2)}</TableCell>
              <TableCell>${c.totalRemaining.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={c.activeLoanCount > 0 ? "warning" : "secondary"}>
                  {c.activeLoanCount}
                </Badge>
              </TableCell>
              <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/app/finance/loans/${c.customerId}`)}
                >
                  {t("common:actions.viewDetails")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
