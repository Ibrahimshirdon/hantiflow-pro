import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  PackageCheck,
  PackageX,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { listSupplierCompanies, listSupplierProducts, listStockRequests } from "@/api/supplier.api";
import { useAuth } from "@/context/AuthContext";
import { toDate } from "@/types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function formatDate(ts: Parameters<typeof toDate>[0]) {
  const date = toDate(ts);
  return date ? date.toLocaleDateString() : "—";
}

type BreakdownKey =
  | "totalProducts"
  | "companies"
  | "wholesaleValue"
  | "unitsShippedOut"
  | "pendingRequests"
  | "valueShippedOut"
  | "submitted"
  | "notSubmitted";

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  purple: "bg-purple/10 text-purple",
} as const;

function StatCard({
  label,
  value,
  viewBreakdownLabel,
  onClick,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  viewBreakdownLabel?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer transition-colors hover:border-primary" : undefined}
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        {Icon && (
          <div className={`flex size-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="size-4.5" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {onClick && <p className="mt-1 text-xs text-primary">{viewBreakdownLabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const;

export function SupplierDashboardPage() {
  const { t } = useTranslation(["supplierPortal", "common"]);
  const { profile } = useAuth();
  const [breakdown, setBreakdown] = useState<BreakdownKey | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["supplierCompanies", "all"],
    queryFn: () => listSupplierCompanies(),
  });
  const { data: products } = useQuery({
    queryKey: ["supplierProducts", "all"],
    queryFn: () => listSupplierProducts(),
  });
  const { data: requests } = useQuery({
    queryKey: ["stockRequests", "all"],
    queryFn: () => listStockRequests(),
  });

  const pendingRequests = useMemo(() => requests?.filter((r) => r.status === "pending") ?? [], [requests]);
  const approvedRequests = useMemo(() => requests?.filter((r) => r.status === "approved") ?? [], [requests]);
  const rejectedRequests = useMemo(() => requests?.filter((r) => r.status === "rejected") ?? [], [requests]);

  const productById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const wholesaleStockValue = useMemo(
    () => round2((products ?? []).reduce((sum, p) => sum + p.quantityInStock * p.wholesalePrice, 0)),
    [products],
  );

  const unitsShippedOut = useMemo(
    () => approvedRequests.reduce((sum, r) => sum + r.quantity, 0),
    [approvedRequests],
  );

  const valueShippedOut = useMemo(
    () =>
      round2(
        approvedRequests.reduce(
          (sum, r) => sum + r.quantity * (productById.get(r.supplierProductId)?.wholesalePrice ?? 0),
          0,
        ),
      ),
    [approvedRequests, productById],
  );

  const submittedProducts = useMemo(() => (products ?? []).filter((p) => p.linkedProductId), [products]);
  const notSubmittedProducts = useMemo(() => (products ?? []).filter((p) => !p.linkedProductId), [products]);
  const submittedCount = submittedProducts.length;
  const notSubmittedCount = notSubmittedProducts.length;

  const lowStockProducts = useMemo(
    () => (products ?? []).filter((p) => p.quantityInStock <= p.minimumStockLevel),
    [products],
  );

  const statusBreakdown = [
    { status: t("common:status.pending"), count: pendingRequests.length },
    { status: t("common:status.approved"), count: approvedRequests.length },
    { status: t("common:status.rejected"), count: rejectedRequests.length },
  ];

  const topProductsByValue = useMemo(
    () =>
      (products ?? [])
        .map((p) => ({ name: p.name, value: round2(p.quantityInStock * p.wholesalePrice) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [products],
  );

  const recentRequests = (requests ?? []).slice(0, 6);

  const valueByCompany = useMemo(() => {
    const byCompany = new Map<string, number>();
    (products ?? []).forEach((p) => {
      const value = p.quantityInStock * p.wholesalePrice;
      byCompany.set(p.companyName, round2((byCompany.get(p.companyName) ?? 0) + value));
    });
    return Array.from(byCompany, ([company, value]) => ({ company, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [products]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("dashboardPage.welcome", { name: profile?.displayName })}
        </h1>
        <p className="text-muted-foreground">{t("dashboardPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("dashboardPage.stats.totalProducts")}
          value={String(products?.length ?? "—")}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("totalProducts")}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label={t("dashboardPage.stats.companies")}
          value={String(companies?.length ?? "—")}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("companies")}
          icon={Building2}
          tone="purple"
        />
        <StatCard
          label={t("dashboardPage.stats.wholesaleValue")}
          value={`$${wholesaleStockValue.toFixed(2)}`}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("wholesaleValue")}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label={t("dashboardPage.stats.unitsShippedOut")}
          value={String(unitsShippedOut)}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("unitsShippedOut")}
          icon={PackageCheck}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("dashboardPage.stats.pendingRequests")}
          value={String(pendingRequests.length)}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("pendingRequests")}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label={t("dashboardPage.stats.valueShippedOut")}
          value={`$${valueShippedOut.toFixed(2)}`}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("valueShippedOut")}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label={t("dashboardPage.stats.submitted")}
          value={String(submittedCount)}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("submitted")}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label={t("dashboardPage.stats.notSubmitted")}
          value={String(notSubmittedCount)}
          viewBreakdownLabel={t("dashboardPage.viewBreakdown")}
          onClick={() => setBreakdown("notSubmitted")}
          icon={PackageX}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardPage.charts.requestsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" name={t("dashboardPage.charts.requests")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardPage.charts.topProductsByValue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsByValue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-primary)" name={t("dashboardPage.charts.wholesaleValue")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboardPage.charts.catalogValueByCompany")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueByCompany}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-primary)" name={t("dashboardPage.charts.wholesaleValue")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("dashboardPage.yourCompanies.title")}
              <Link to="/supplier/companies" className="text-xs font-normal text-primary hover:underline">
                {t("dashboardPage.viewAll")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common:fields.name")}</TableHead>
                  <TableHead>{t("dashboardPage.yourCompanies.location")}</TableHead>
                  <TableHead>{t("dashboardPage.yourCompanies.manager")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!companies || companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {t("dashboardPage.yourCompanies.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.location}</TableCell>
                      <TableCell className="text-muted-foreground">{company.managerName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("dashboardPage.recentRequests.title")}
              <Link to="/supplier/stock-requests" className="text-xs font-normal text-primary hover:underline">
                {t("dashboardPage.viewAll")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboardPage.table.product")}</TableHead>
                  <TableHead>{t("dashboardPage.table.qty")}</TableHead>
                  <TableHead>{t("common:fields.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {t("dashboardPage.recentRequests.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.productName}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[request.status]}>
                          {t(`common:status.${request.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {t("dashboardPage.lowStock.title")}
            {lowStockProducts.length > 0 && <Badge variant="destructive">{lowStockProducts.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboardPage.lowStock.empty")}</p>
          ) : (
            lowStockProducts.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <Link to="/supplier/products" className="hover:underline">
                  {product.name}
                </Link>
                <span className="text-muted-foreground">
                  {product.quantityInStock} / {product.minimumStockLevel} {product.unitType}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={breakdown !== null} onOpenChange={(open) => !open && setBreakdown(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {breakdown === "totalProducts" && t("dashboardPage.stats.totalProducts")}
              {breakdown === "companies" && t("dashboardPage.stats.companies")}
              {breakdown === "wholesaleValue" && t("dashboardPage.stats.wholesaleValue")}
              {breakdown === "unitsShippedOut" && t("dashboardPage.stats.unitsShippedOut")}
              {breakdown === "pendingRequests" && t("dashboardPage.stats.pendingRequests")}
              {breakdown === "valueShippedOut" && t("dashboardPage.stats.valueShippedOut")}
              {breakdown === "submitted" && t("dashboardPage.stats.submitted")}
              {breakdown === "notSubmitted" && t("dashboardPage.stats.notSubmitted")}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {breakdown === "totalProducts" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboardPage.table.product")}</TableHead>
                    <TableHead>{t("dashboardPage.table.qtyInStock")}</TableHead>
                    <TableHead>{t("dashboardPage.table.wholesalePrice")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.quantityInStock}</TableCell>
                      <TableCell>${p.wholesalePrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">
                      {t("dashboardPage.stats.totalProducts")}
                    </TableCell>
                    <TableCell className="font-semibold">{products?.length ?? 0}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {breakdown === "companies" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common:fields.name")}</TableHead>
                    <TableHead>{t("dashboardPage.yourCompanies.location")}</TableHead>
                    <TableHead>{t("dashboardPage.yourCompanies.manager")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(companies ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.location}</TableCell>
                      <TableCell className="text-muted-foreground">{c.managerName}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">
                      {t("dashboardPage.breakdown.totalCompanies")}
                    </TableCell>
                    <TableCell className="font-semibold">{companies?.length ?? 0}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {breakdown === "wholesaleValue" && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("dashboardPage.breakdown.wholesaleValueHint")}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboardPage.table.product")}</TableHead>
                      <TableHead>{t("dashboardPage.table.qty")}</TableHead>
                      <TableHead>{t("dashboardPage.table.wholesalePrice")}</TableHead>
                      <TableHead className="text-end">{t("dashboardPage.breakdown.subtotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.quantityInStock}</TableCell>
                        <TableCell>${p.wholesalePrice.toFixed(2)}</TableCell>
                        <TableCell className="text-end">
                          ${round2(p.quantityInStock * p.wholesalePrice).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">
                        {t("dashboardPage.breakdown.totalWholesaleValue")}
                      </TableCell>
                      <TableCell className="text-end font-semibold">
                        ${wholesaleStockValue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}

            {breakdown === "unitsShippedOut" && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("dashboardPage.breakdown.unitsShippedOutHint")}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboardPage.table.product")}</TableHead>
                      <TableHead>{t("common:fields.quantity")}</TableHead>
                      <TableHead>{t("common:status.approved")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {t("dashboardPage.breakdown.noApprovedRequests")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.productName}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(r.respondedAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">
                        {t("dashboardPage.stats.unitsShippedOut")}
                      </TableCell>
                      <TableCell className="font-semibold">{unitsShippedOut}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}

            {breakdown === "pendingRequests" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboardPage.table.product")}</TableHead>
                    <TableHead>{t("common:fields.quantity")}</TableHead>
                    <TableHead>{t("dashboardPage.breakdown.requestedBy")}</TableHead>
                    <TableHead>{t("common:fields.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t("dashboardPage.breakdown.noPendingRequests")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.productName}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{r.requestedByName}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {breakdown === "valueShippedOut" && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("dashboardPage.breakdown.valueShippedOutHint")}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboardPage.table.product")}</TableHead>
                      <TableHead>{t("common:fields.quantity")}</TableHead>
                      <TableHead>{t("dashboardPage.table.currentWholesalePrice")}</TableHead>
                      <TableHead className="text-end">{t("dashboardPage.breakdown.subtotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {t("dashboardPage.breakdown.noApprovedRequests")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedRequests.map((r) => {
                        const price = productById.get(r.supplierProductId)?.wholesalePrice ?? 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.productName}</TableCell>
                            <TableCell>{r.quantity}</TableCell>
                            <TableCell>${price.toFixed(2)}</TableCell>
                            <TableCell className="text-end">
                              ${round2(r.quantity * price).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">
                        {t("dashboardPage.stats.valueShippedOut")}
                      </TableCell>
                      <TableCell className="text-end font-semibold">
                        ${valueShippedOut.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}

            {breakdown === "submitted" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboardPage.table.product")}</TableHead>
                    <TableHead>{t("dashboardPage.table.qtyInStock")}</TableHead>
                    <TableHead>{t("dashboardPage.breakdown.linkedProductId")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submittedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {t("dashboardPage.breakdown.noSubmittedProducts")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    submittedProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.quantityInStock}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.linkedProductId}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {breakdown === "notSubmitted" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboardPage.table.product")}</TableHead>
                    <TableHead>{t("dashboardPage.table.qtyInStock")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notSubmittedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        {t("dashboardPage.breakdown.allSubmitted")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    notSubmittedProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.quantityInStock}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
