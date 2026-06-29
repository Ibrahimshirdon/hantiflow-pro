import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getProductByBarcode, listProducts } from "@/api/inventory.api";
import { listTaxRates, createSalesOrder, previewDiscount, type CreateSalesOrderInput } from "@/api/sales.api";
import { listUsers } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import type { Product } from "@/types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  categoryId: string;
  quantity: number;
}

const PAYMENT_METHOD_VALUES = ["cash", "card", "wallet", "mobile_money", "loan"] as const;

export function POSPage() {
  const { t } = useTranslation(["sales", "common"]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<CreateSalesOrderInput["paymentMethod"]>("cash");
  const [customerId, setCustomerId] = useState<string>("none");

  const { data: products } = useQuery({
    queryKey: ["products", "availableForSale"],
    queryFn: () => listProducts({ availableForSale: true }),
  });
  const { data: taxRates } = useQuery({ queryKey: ["taxRates"], queryFn: listTaxRates });
  const { data: customers } = useQuery({
    queryKey: ["users", "customer"],
    queryFn: () => listUsers("customer"),
  });

  const taxRateById = useMemo(() => {
    const map = new Map<string, number>();
    taxRates?.forEach((t) => map.set(t.id, t.rate));
    return map;
  }, [taxRates]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term),
    );
  }, [products, search]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRateId ? taxRateById.get(product.taxRateId) ?? 0 : 0,
          categoryId: product.categoryId,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, quantity } : line)));
  }

  async function handleBarcodeSearch() {
    const term = search.trim();
    if (!term) return;
    try {
      const product = await getProductByBarcode(term);
      addToCart(product);
      setSearch("");
    } catch {
      // not a barcode match - fall through to normal text filtering, no error needed
    }
  }

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const previewMutation = useMutation({
    mutationFn: () =>
      previewDiscount(
        discountCode,
        cart.map((line) => ({
          productId: line.productId,
          categoryId: line.categoryId,
          lineSubtotal: line.unitPrice * line.quantity,
        })),
      ),
    onSuccess: (result) => {
      setAppliedDiscount({ code: discountCode, amount: result.discountAmount });
      toast.success(t("posPage.toasts.discountApplied", { amount: result.discountAmount.toFixed(2) }));
    },
    onError: (error) => {
      setAppliedDiscount(null);
      toast.error(getApiErrorMessage(error));
    },
  });

  const discountTotal = appliedDiscount?.amount ?? 0;
  const taxTotal = cart.reduce((sum, line) => {
    const lineTotal = line.unitPrice * line.quantity;
    const discountShare = subtotal > 0 ? (lineTotal / subtotal) * discountTotal : 0;
    return sum + (lineTotal - discountShare) * line.taxRate;
  }, 0);
  const grandTotal = subtotal - discountTotal + taxTotal;

  const checkoutMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: (result) => {
      toast.success(t("posPage.toasts.saleCompleted"));
      setCart([]);
      setDiscountCode("");
      setAppliedDiscount(null);
      navigate(`/app/sales/orders/${result.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error(t("posPage.toasts.cartEmpty"));
      return;
    }
    if (paymentMethod === "loan" && customerId === "none") {
      toast.error(t("posPage.toasts.loanRequiresCustomer"));
      return;
    }
    checkoutMutation.mutate({
      customerId: customerId === "none" ? undefined : customerId,
      items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      discountCode: appliedDiscount?.code,
      paymentMethod,
    });
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-[1fr_360px] gap-4">
      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2">
          <Input
            placeholder={t("posPage.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBarcodeSearch();
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 overflow-y-auto pe-1 sm:grid-cols-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => addToCart(product)}
            >
              <CardContent className="flex flex-col gap-1 p-3">
                <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">${product.sellingPrice.toFixed(2)}</span>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t("posPage.inStock", { count: product.totalStock, unit: product.unit })}
                  </span>
                  {product.totalStock <= 0 ? (
                    <Badge variant="destructive">{t("common:status.outOfStock")}</Badge>
                  ) : (
                    product.totalStock <= product.reorderLevel && (
                      <Badge variant="warning">{t("common:status.lowStock")}</Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("posPage.walkInCustomer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("posPage.walkInCustomer")}</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.uid} value={c.uid}>
                    {c.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">{t("posPage.cartEmpty")}</p>
            )}
            {cart.map((line) => (
              <div key={line.productId} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("posPage.eachPrice", { price: line.unitPrice.toFixed(2) })}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={line.quantity}
                  onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                  className="w-16 text-center"
                />
                <span className="w-16 text-end text-sm font-medium">
                  ${(line.unitPrice * line.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t("posPage.discountCodePlaceholder")}
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              disabled={!discountCode || cart.length === 0 || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {t("posPage.apply")}
            </Button>
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.subtotal")}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.discount")}</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common:fields.tax")}</span>
              <span>${taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t("common:fields.total")}</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`posPage.paymentMethods.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="lg"
            disabled={cart.length === 0 || checkoutMutation.isPending}
            onClick={handleCheckout}
          >
            {checkoutMutation.isPending
              ? t("posPage.processing")
              : t("posPage.charge", { total: grandTotal.toFixed(2) })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
