import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  approveProduct,
  deleteProduct,
  getProduct,
  listBatchesForProduct,
  listCategories,
  listStockAdjustments,
  uploadProductImage,
} from "@/api/inventory.api";
import { listTaxRates } from "@/api/sales.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { toDate } from "@/types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { EditProductDialog } from "./EditProductDialog";

function formatDate(ts: Parameters<typeof toDate>[0]) {
  const date = toDate(ts);
  return date ? date.toLocaleDateString() : "—";
}

function isExpiringSoon(ts: Parameters<typeof toDate>[0]) {
  const date = toDate(ts);
  if (!date) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export function ProductDetailPage() {
  const { t } = useTranslation(["inventory", "common"]);
  const { id } = useParams<{ id: string }>();
  const productId = id!;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const { data: taxRates } = useQuery({ queryKey: ["taxRates"], queryFn: listTaxRates });
  const { data: batches } = useQuery({
    queryKey: ["batches", productId],
    queryFn: () => listBatchesForProduct(productId),
  });
  const { data: adjustments } = useQuery({
    queryKey: ["adjustments", productId],
    queryFn: () => listStockAdjustments(productId),
  });

  const imageMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(productId, file),
    onSuccess: () => {
      toast.success(t("productDetailPage.toasts.imageUploaded"));
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      toast.success(t("productDetailPage.toasts.deleted"));
      navigate("/app/inventory/products");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveProduct(productId),
    onSuccess: () => {
      toast.success(t("productDetailPage.toasts.approved"));
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!product) {
    return <p className="text-muted-foreground">{t("common:actions.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} className="size-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">{t("productDetailPage.noImage")}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {product.isLowStock && <Badge variant="warning">{t("productDetailPage.lowStock")}</Badge>}
            <Badge variant={product.isActive ? "success" : "secondary"}>
              {product.isActive ? t("common:status.active") : t("common:status.inactive")}
            </Badge>
            {product.approvalStatus === "pending" && (
              <Badge variant="warning">{t("productDetailPage.pendingApproval")}</Badge>
            )}
            <div className="ms-auto flex gap-2">
              {product.approvalStatus === "pending" && profile?.role === "admin" && (
                <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  {approveMutation.isPending ? t("productDetailPage.approving") : t("productDetailPage.approveProduct")}
                </Button>
              )}
              {(profile?.role === "admin" || profile?.role === "manager") && (
                <EditProductDialog
                  product={product}
                  categories={categories ?? []}
                  taxRates={taxRates ?? []}
                />
              )}
              {profile?.role === "admin" && (
                <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                  {t("productDetailPage.deleteProduct")}
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">
            {t("productDetailPage.skuLabel", { sku: product.sku })}{" "}
            {product.barcode && t("productDetailPage.barcodeLabel", { barcode: product.barcode })} ·{" "}
            {product.categoryName}
          </p>
          <p className="mt-1 text-sm">
            {t("productDetailPage.costLabel", { value: product.costPrice.toFixed(2) })} ·{" "}
            {t("productDetailPage.sellingLabel", { value: product.sellingPrice.toFixed(2) })} ·{" "}
            {t("productDetailPage.totalStockLabel", { qty: product.totalStock, unit: product.unit })} ·{" "}
            {t("productDetailPage.reorderLevelLabel", { value: product.reorderLevel })}
            {product.maxStockLevel != null &&
              ` · ${t("productDetailPage.maxStockLabel", { value: product.maxStockLevel })}`}
            {" · "}
            {t("productDetailPage.taxLabel")}{" "}
            {product.taxRateId
              ? (() => {
                  const rate = taxRates?.find((rt) => rt.id === product.taxRateId);
                  return rate ? `${rate.name} (${(rate.rate * 100).toFixed(0)}%)` : "—";
                })()
              : t("productDetailPage.noTax")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) imageMutation.mutate(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={imageMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageMutation.isPending ? t("productDetailPage.uploading") : t("productDetailPage.uploadImage")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">{t("productDetailPage.tabs.batches")}</TabsTrigger>
          <TabsTrigger value="adjustments">{t("productDetailPage.tabs.adjustments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("productDetailPage.batchNumber")}</TableHead>
                    <TableHead>{t("common:fields.quantity")}</TableHead>
                    <TableHead>{t("productDetailPage.expiryDate")}</TableHead>
                    <TableHead>{t("common:fields.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t("productDetailPage.noBatches")}
                      </TableCell>
                    </TableRow>
                  )}
                  {batches?.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>
                        {formatDate(batch.expiryDate)}
                        {batch.status === "active" && isExpiringSoon(batch.expiryDate) && (
                          <Badge variant="destructive" className="ms-2">
                            {t("productDetailPage.expiringSoon")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{batch.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-end">
                <AdjustStockDialog productId={productId} batches={batches ?? []} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common:fields.date")}</TableHead>
                    <TableHead>{t("productDetailPage.type")}</TableHead>
                    <TableHead>{t("productDetailPage.change")}</TableHead>
                    <TableHead>{t("productDetailPage.reason")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t("productDetailPage.noAdjustments")}
                      </TableCell>
                    </TableRow>
                  )}
                  {adjustments?.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell>{formatDate(adjustment.createdAt)}</TableCell>
                      <TableCell className="capitalize">{adjustment.type}</TableCell>
                      <TableCell
                        className={adjustment.quantityChange < 0 ? "text-destructive" : "text-emerald-600"}
                      >
                        {adjustment.quantityChange > 0 ? "+" : ""}
                        {adjustment.quantityChange}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{adjustment.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("productDetailPage.deleteDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("productDetailPage.deleteConfirmText", { name: product.name })}
            {product.totalStock > 0 && (
              <span className="mt-2 block text-destructive">
                {t("productDetailPage.deleteStockWarning", {
                  qty: product.totalStock,
                  unit: product.unit,
                })}
              </span>
            )}
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || product.totalStock > 0}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("productDetailPage.deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
