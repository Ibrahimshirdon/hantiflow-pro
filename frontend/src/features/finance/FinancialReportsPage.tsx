import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  Package,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getCashFlow, getFinancialSummary } from "@/api/finance.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function monthAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
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

export function FinancialReportsPage() {
  const { t } = useTranslation(["finance", "common"]);
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const range = { dateFrom, dateTo };

  const { data: summary } = useQuery({
    queryKey: ["financialSummary", dateFrom, dateTo],
    queryFn: () => getFinancialSummary(range),
  });
  const { data: cashFlow } = useQuery({
    queryKey: ["cashFlow", dateFrom, dateTo],
    queryFn: () => getCashFlow(range),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("financialReportsPage.title")}</h1>
        <p className="text-muted-foreground">{t("financialReportsPage.subtitle")}</p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateFrom">{t("financialReportsPage.filters.from")}</Label>
          <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateTo">{t("financialReportsPage.filters.to")}</Label>
          <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label={t("financialReportsPage.stats.salesRevenue")}
          value={`$${(summary?.salesRevenue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          tone="primary"
        />
        <StatCard
          label={t("financialReportsPage.stats.otherIncome")}
          value={`$${(summary?.otherIncomeTotal ?? 0).toFixed(2)}`}
          icon={Wallet}
          tone="purple"
        />
        <StatCard
          label={t("financialReportsPage.stats.totalRevenue")}
          value={`$${(summary?.totalRevenue ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label={t("financialReportsPage.stats.costOfGoodsSold")}
          value={`$${(summary?.costOfGoodsSold ?? 0).toFixed(2)}`}
          icon={Package}
          tone="warning"
        />
        <StatCard
          label={t("financialReportsPage.stats.totalExpenses")}
          value={`$${(summary?.totalExpenses ?? 0).toFixed(2)}`}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label={t("financialReportsPage.stats.netProfit")}
          value={`$${(summary?.netProfit ?? 0).toFixed(2)}`}
          icon={PiggyBank}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("financialReportsPage.cashFlowCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlow ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cashIn"
                  stroke="var(--color-success)"
                  name={t("financialReportsPage.cashFlowCard.cashIn")}
                />
                <Line
                  type="monotone"
                  dataKey="cashOut"
                  stroke="var(--color-destructive)"
                  name={t("financialReportsPage.cashFlowCard.cashOut")}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-primary)"
                  name={t("financialReportsPage.cashFlowCard.net")}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("financialReportsPage.expensesByCategoryCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.expensesByCategory ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="var(--color-primary)" name={t("common:fields.amount")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
