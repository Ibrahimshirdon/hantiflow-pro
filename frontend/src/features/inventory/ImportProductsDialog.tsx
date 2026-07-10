import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { importProducts, type ImportProductRow, type ImportProductResult } from "@/api/inventory.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TEMPLATE_HEADERS = ["name", "sku", "category", "unit", "costPrice", "sellingPrice", "reorderLevel", "barcode"];

const TEMPLATE_EXAMPLE = [
  "Mineral Water 500ml", "MW-500", "Beverages", "pcs", "0.50", "1.00", "20", "6001234567890",
  "Sunflower Oil 1L", "OIL-1L", "Groceries", "pcs", "1.20", "2.50", "15", "",
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS.join(",")];
  for (let i = 0; i < TEMPLATE_EXAMPLE.length; i += TEMPLATE_HEADERS.length) {
    rows.push(TEMPLATE_EXAMPLE.slice(i, i + TEMPLATE_HEADERS.length).join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

function csvToRows(rawRows: string[][]): ImportProductRow[] {
  const [header, ...dataRows] = rawRows;
  if (!header) return [];
  const idx = (col: string) => header.findIndex((h) => h.toLowerCase().trim() === col);
  const iName = idx("name");
  const iSku = idx("sku");
  const iCat = idx("category");
  const iUnit = idx("unit");
  const iCost = idx("costprice");
  const iSell = idx("sellingprice");
  const iReorder = idx("reorderlevel");
  const iBarcode = idx("barcode");

  return dataRows.map((cols) => ({
    name: cols[iName] ?? "",
    sku: cols[iSku] ?? "",
    category: cols[iCat] ?? "",
    unit: cols[iUnit] ?? "pcs",
    costPrice: parseFloat(cols[iCost] ?? "0") || 0,
    sellingPrice: parseFloat(cols[iSell] ?? "0") || 0,
    reorderLevel: parseInt(cols[iReorder] ?? "5", 10) || 5,
    barcode: cols[iBarcode] || undefined,
  }));
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ImportProductsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation(["inventory", "common"]);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ImportProductRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportProductResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => importProducts(rows),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setRows([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const raw = parseCsv(text);
        if (raw.length < 2) {
          setParseError(t("importProductsDialog.errorEmpty"));
          return;
        }
        const parsed = csvToRows(raw);
        setRows(parsed);
      } catch {
        setParseError(t("importProductsDialog.errorParse"));
      }
    };
    reader.readAsText(file);
  }

  function reset() {
    setRows([]);
    setParseError(null);
    setResult(null);
    mutation.reset();
    if (fileRef.current) fileRef.current.value = "";
  }

  const preview = rows.slice(0, 5);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("importProductsDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Download template */}
          <Button variant="outline" size="sm" className="self-start" onClick={downloadTemplate}>
            <Download className="me-1.5 size-4" />
            {t("importProductsDialog.downloadTemplate")}
          </Button>

          {/* File picker */}
          {!result && (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/20"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {rows.length > 0
                  ? t("importProductsDialog.fileLoaded", { count: rows.length })
                  : t("importProductsDialog.dropzone")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {parseError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && !result && (
            <div className="overflow-x-auto">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {t("importProductsDialog.preview", { count: Math.min(rows.length, 5) })}
                {rows.length > 5 && ` (${t("importProductsDialog.andMore", { count: rows.length - 5 })})`}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common:fields.name")}</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>{t("importProductsDialog.colCategory")}</TableHead>
                    <TableHead>{t("importProductsDialog.colUnit")}</TableHead>
                    <TableHead>{t("importProductsDialog.colCost")}</TableHead>
                    <TableHead>{t("importProductsDialog.colSelling")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>${row.costPrice.toFixed(2)}</TableCell>
                      <TableCell>${row.sellingPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                {t("importProductsDialog.resultCreated", { count: result.created })}
              </div>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("importProductsDialog.resultSkipped", { count: result.skipped })}
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-destructive">
                    {t("importProductsDialog.resultErrors", { count: result.errors.length })}
                  </p>
                  <ul className="max-h-32 overflow-y-auto text-xs text-muted-foreground">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        {t("importProductsDialog.errorRow", { row: e.row, message: e.message })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {result ? (
              <>
                <Button variant="outline" onClick={reset}>
                  {t("importProductsDialog.importMore")}
                </Button>
                <Button onClick={() => { reset(); onOpenChange(false); }}>
                  {t("common:actions.close")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
                  {t("common:actions.cancel")}
                </Button>
                <Button
                  disabled={rows.length === 0 || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  <Upload className="me-1.5 size-4" />
                  {mutation.isPending
                    ? t("importProductsDialog.importing")
                    : t("importProductsDialog.import", { count: rows.length })}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
