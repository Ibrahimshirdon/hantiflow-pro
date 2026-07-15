import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Product } from "@/types/inventory.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  product: Product;
}

export function BarcodePrintDialog({ product }: Props) {
  const { t } = useTranslation(["inventory"]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !canvasRef.current || !product.barcode) return;
    try {
      JsBarcode(canvasRef.current, product.barcode, {
        format: "CODE128",
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 13,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // barcode string not valid for CODE128
    }
  }, [open, product.barcode]);

  function handlePrint() {
    if (!product.barcode) return;
    // Use a fresh offscreen canvas so the result is never affected by
    // dialog animation state or a zero-sized DOM canvas.
    const offscreen = document.createElement("canvas");
    try {
      JsBarcode(offscreen, product.barcode, {
        format: "CODE128",
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 13,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      toast.error("Could not generate barcode — check the barcode value");
      return;
    }
    const dataUrl = offscreen.toDataURL("image/png");
    const win = window.open("", "_blank", "width=420,height=360");
    if (!win) {
      toast.error(t("inventory:barcodePrintDialog.popupBlocked"));
      return;
    }
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Label: ${product.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:16px;text-align:center}
    .name{font-size:13px;font-weight:bold;max-width:220px;margin:0 auto 4px}
    .price{font-size:22px;font-weight:bold;margin-bottom:8px}
    .sku{font-size:10px;color:#555;margin-top:4px}
    img{max-width:100%;display:block;margin:0 auto}
  </style>
</head>
<body>
  <div class="name">${product.name}</div>
  <div class="price">$${product.sellingPrice.toFixed(2)}</div>
  <img src="${dataUrl}" alt="barcode" />
  <div class="sku">SKU: ${product.sku}</div>
  <script>window.onload=function(){window.print();window.close()}</script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Printer className="size-4" />
          {t("inventory:barcodePrintDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory:barcodePrintDialog.title")}</DialogTitle>
        </DialogHeader>

        {/* Label preview — always white background so barcode is readable */}
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
          <p className="max-w-[200px] text-center text-sm font-bold text-black">{product.name}</p>
          <p className="text-xl font-bold text-black">${product.sellingPrice.toFixed(2)}</p>
          <canvas ref={canvasRef} className="max-w-full" />
          <p className="text-[11px] text-gray-500">SKU: {product.sku}</p>
        </div>

        <Button className="w-full gap-2" onClick={handlePrint}>
          <Printer className="size-4" />
          {t("inventory:barcodePrintDialog.print")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
