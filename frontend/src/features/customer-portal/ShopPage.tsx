import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { listCategories, listProducts } from "@/api/inventory.api";
import { listTaxRates, previewDiscount } from "@/api/sales.api";
import { customerCheckout, getDeliveryFee, type CustomerCheckoutInput } from "@/api/customer.api";
import { getApiErrorMessage } from "@/api/client";
import type { Product } from "@/types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FULFILLMENT_OPTIONS = [
  { value: "pickup", labelKey: "shopPage.fulfillment.pickup" },
  { value: "delivery", labelKey: "shopPage.fulfillment.delivery" },
] as const;

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  categoryId: string;
  quantity: number;
}

const PAYMENT_METHODS = [
  { value: "wallet", labelKey: "shopPage.paymentMethods.wallet" },
  { value: "cash", labelKey: "shopPage.paymentMethods.cash" },
  { value: "card", labelKey: "shopPage.paymentMethods.card" },
  { value: "mobile_money", labelKey: "shopPage.paymentMethods.mobileMoney" },
  { value: "loan", labelKey: "shopPage.paymentMethods.loan" },
] as const;

export function ShopPage() {
  const { t } = useTranslation(["customerPortal"]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<CustomerCheckoutInput["paymentMethod"]>("wallet");
  const [fulfillmentType, setFulfillmentType] =
    useState<CustomerCheckoutInput["fulfillmentType"]>("pickup");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const { data: products } = useQuery({
    queryKey: ["products", "availableForSale"],
    queryFn: () => listProducts({ availableForSale: true }),
  });
  const { data: taxRates } = useQuery({ queryKey: ["taxRates"], queryFn: listTaxRates });
  const { data: deliveryFee = 0 } = useQuery({ queryKey: ["deliveryFee"], queryFn: getDeliveryFee });

  const taxRateById = useMemo(() => {
    const map = new Map<string, number>();
    taxRates?.forEach((t) => map.set(t.id, t.rate));
    return map;
  }, [taxRates]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.isActive && p.totalStock > 0)
      .filter((p) => categoryId === "all" || p.categoryId === categoryId)
      .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [products, categoryId, search]);

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
    toast.success(t("shopPage.toasts.addedToCart", { name: product.name }));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, quantity } : line)));
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
      toast.success(
        t("shopPage.toasts.discountApplied", { amount: `$${result.discountAmount.toFixed(2)}` }),
      );
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
  const effectiveDeliveryFee = fulfillmentType === "delivery" ? deliveryFee : 0;
  const grandTotal = subtotal - discountTotal + taxTotal + effectiveDeliveryFee;

  const checkoutMutation = useMutation({
    mutationFn: customerCheckout,
    onSuccess: (result) => {
      toast.success(t("shopPage.toasts.orderPlaced"));
      setCart([]);
      setDiscountCode("");
      setAppliedDiscount(null);
      setDeliveryLine1("");
      setDeliveryCity("");
      navigate(`/portal/orders/${result.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error(t("shopPage.toasts.cartEmpty"));
      return;
    }
    if (fulfillmentType === "delivery" && (!deliveryLine1.trim() || !deliveryCity.trim())) {
      toast.error(t("shopPage.toasts.enterDeliveryAddress"));
      return;
    }
    checkoutMutation.mutate({
      items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      discountCode: appliedDiscount?.code,
      paymentMethod,
      fulfillmentType,
      deliveryAddress:
        fulfillmentType === "delivery"
          ? { label: t("shopPage.deliveryAddressLabel"), line1: deliveryLine1, city: deliveryCity }
          : undefined,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={t("shopPage.search.placeholder")}
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("shopPage.search.allCategories")}</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("shopPage.product.noImage")}</span>
                  )}
                </div>
                <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">${product.sellingPrice.toFixed(2)}</span>
                <Button size="sm" onClick={() => addToCart(product)}>
                  {t("shopPage.product.addToCart")}
                </Button>
              </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              {t("shopPage.noProductsFound")}
            </p>
          )}
        </div>
      </div>

      <Card className="h-fit">
        <CardContent className="flex flex-col gap-3 p-4">
          <h2 className="font-semibold">{t("shopPage.cart.title")}</h2>
          {cart.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("shopPage.cart.empty")}</p>
          )}
          {cart.map((line) => (
            <div key={line.productId} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("shopPage.cart.unitPriceEach", { price: `$${line.unitPrice.toFixed(2)}` })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                >
                  -
                </Button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder={t("shopPage.cart.discountCodePlaceholder")}
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              disabled={!discountCode || cart.length === 0 || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {t("shopPage.cart.apply")}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Label>{t("shopPage.cart.fulfillmentLabel")}</Label>
            <Select
              value={fulfillmentType}
              onValueChange={(v) => setFulfillmentType(v as typeof fulfillmentType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FULFILLMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fulfillmentType === "delivery" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deliveryLine1">{t("shopPage.cart.addressLabel")}</Label>
                <Input
                  id="deliveryLine1"
                  value={deliveryLine1}
                  onChange={(e) => setDeliveryLine1(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deliveryCity">{t("shopPage.cart.cityLabel")}</Label>
                <Input
                  id="deliveryCity"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shopPage.cart.subtotal")}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shopPage.cart.discount")}</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shopPage.cart.tax")}</span>
              <span>${taxTotal.toFixed(2)}</span>
            </div>
            {fulfillmentType === "delivery" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("shopPage.cart.deliveryFee")}</span>
                <span>${effectiveDeliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>{t("shopPage.cart.total")}</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {t(method.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button disabled={cart.length === 0 || checkoutMutation.isPending} onClick={handleCheckout}>
            {checkoutMutation.isPending
              ? t("shopPage.cart.placingOrder")
              : t("shopPage.cart.placeOrder", { total: `$${grandTotal.toFixed(2)}` })}
          </Button>
          {appliedDiscount && (
            <Badge variant="success">
              {t("shopPage.cart.codeApplied", { code: appliedDiscount.code })}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
