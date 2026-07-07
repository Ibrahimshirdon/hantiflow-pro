import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  createStockRequest,
  listStockRequests,
  listSupplierProducts,
} from "@/api/supplier.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { SupplierProduct } from "@/types/supplier.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const;

export function SupplierStockPage() {
  const { t } = useTranslation(["suppliers", "common"]);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [requesting, setRequesting] = useState<SupplierProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  // Filters for stock requests history
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["supplierProducts", "all"],
    queryFn: () => listSupplierProducts(),
  });
  const { data: stockRequests } = useQuery({
    queryKey: ["stockRequests", "all"],
    queryFn: () => listStockRequests(),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      createStockRequest({
        supplierProductId: requesting!.id,
        quantity,
        message: message || undefined,
      }),
    onSuccess: () => {
      toast.success(t("toasts.requestSent"));
      queryClient.invalidateQueries({ queryKey: ["stockRequests"] });
      setRequesting(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openRequest(product: SupplierProduct) {
    setQuantity(Math.min(1, product.quantityInStock));
    setMessage("");
    setRequesting(product);
  }

  const filteredRequests = useMemo(() => {
    if (!stockRequests) return [];
    return stockRequests.filter((r) => {
      const date = new Date(r.createdAt._seconds * 1000);
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + "T23:59:59")) return false;
      if (roleFilter !== "all" && r.requestedByRole !== roleFilter) return false;
      return true;
    });
  }, [stockRequests, dateFrom, dateTo, roleFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("stockPage.title")}</h1>
        <p className="text-muted-foreground">{t("stockPage.subtitle")}</p>
      </div>

      {/* Supplier products table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("stockPage.table.product")}</TableHead>
            <TableHead>{t("stockPage.table.company")}</TableHead>
            <TableHead>{t("stockPage.table.supplier")}</TableHead>
            <TableHead>{t("stockPage.table.manager")}</TableHead>
            <TableHead>{t("stockPage.table.category")}</TableHead>
            <TableHead>{t("stockPage.table.available")}</TableHead>
            <TableHead>{t("stockPage.table.unit")}</TableHead>
            <TableHead>{t("stockPage.table.wholesalePrice")}</TableHead>
            <TableHead>{t("stockPage.table.sellingPrice")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && products?.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                {t("stockPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {products
            ?.filter((p) => p.isActive)
            .map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                </TableCell>
                <TableCell>{product.companyName}</TableCell>
                <TableCell>{product.supplierName}</TableCell>
                <TableCell>{product.companyManagerName}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.quantityInStock}</TableCell>
                <TableCell className="text-muted-foreground">{product.unitType}</TableCell>
                <TableCell>${product.wholesalePrice.toFixed(2)}</TableCell>
                <TableCell>${product.sellingPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={product.linkedProductId ? "success" : "warning"}>
                    {product.linkedProductId ? t("stockPage.inCatalog") : t("stockPage.notYetSubmitted")}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={product.quantityInStock <= 0}
                    onClick={() => openRequest(product)}
                  >
                    {t("stockPage.requestStock")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* Stock requests history with filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("stockPage.requestsCard.title")}</CardTitle>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterFrom")}</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterTo")}</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{t("stockPage.requestsCard.filterRole")}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("stockPage.requestsCard.allRoles")}</SelectItem>
                    <SelectItem value="admin">{t("stockPage.requestsCard.roleAdmin")}</SelectItem>
                    <SelectItem value="manager">{t("stockPage.requestsCard.roleManager")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(dateFrom || dateTo || roleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setDateFrom(""); setDateTo(""); setRoleFilter("all"); }}
                >
                  {t("common:actions.clear")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stockPage.table.product")}</TableHead>
                <TableHead>{t("common:fields.quantity")}</TableHead>
                <TableHead>{t("stockPage.requestsCard.requestedBy")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("common:fields.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("stockPage.requestsCard.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.productName}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.requestedByName}{" "}
                      <span className="text-xs capitalize">({request.requestedByRole})</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[request.status]}>
                        {t(`common:status.${request.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.createdAt._seconds * 1000).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request stock dialog */}
      <Dialog open={requesting !== null} onOpenChange={(next) => !next && setRequesting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("stockPage.dialog.title", { name: requesting?.name })}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                {t("stockPage.dialog.quantityLabel", { count: requesting?.quantityInStock ?? 0 })}
              </Label>
              <Input
                type="number"
                min={1}
                max={requesting?.quantityInStock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("stockPage.dialog.messageLabel")}</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={requestMutation.isPending || quantity <= 0}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? t("stockPage.dialog.sending") : t("stockPage.dialog.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
