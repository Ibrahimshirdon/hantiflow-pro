import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { importProducts, listCategories, type ImportProductRow, type ImportProductResult } from "@/api/inventory.api";
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

// Remove leading emoji/symbols so category names in the CSV are plain text
function stripLeadingEmoji(s: string): string {
  return s.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/gu, "").trim();
}

function quoteCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function downloadTemplate(categoryNames: string[]) {
  const plainNames = categoryNames.map(stripLeadingEmoji);
  const cat1 = plainNames[0] ?? "Category Name";
  const cat2 = plainNames[1] ?? cat1;
  // Use ="value" Excel formula for barcode to force text format (prevents 1.23E+08 display)
  const examples = [
    ["Mineral Water 500ml", "MW-500", cat1, "pcs", "0.50", "1.00", "20", '="8901234567890"'],
    ["Sunflower Oil 1L", "OIL-1L", cat2, "pcs", "1.20", "2.50", "15", ""],
  ];
  const csvRows = [TEMPLATE_HEADERS.join(","), ...examples.map((r) => r.map(quoteCsv).join(","))];
  // ﻿ BOM tells Excel this file is UTF-8 so it renders non-ASCII characters correctly
  const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
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

  return dataRows.map((cols) => {
    const rawBarcode = (cols[iBarcode] ?? "").trim();
    let barcode: string | undefined;
    if (rawBarcode) {
      // Handle Excel formula style: ="8901234567890" → 8901234567890
      const formula = rawBarcode.match(/^="?([^"]+)"?$/);
      if (formula) {
        barcode = formula[1];
      } else if (/e[+\-]/i.test(rawBarcode)) {
        // Handle scientific notation: 1.23E+08 → convert back to integer string
        const n = Number(rawBarcode);
        barcode = isNaN(n) ? rawBarcode : String(Math.round(n));
      } else {
        barcode = rawBarcode;
      }
    }
    return {
      name: cols[iName] ?? "",
      sku: cols[iSku] ?? "",
      category: (cols[iCat] ?? "").trim(),
      unit: cols[iUnit] ?? "pcs",
      costPrice: parseFloat(cols[iCost] ?? "0") || 0,
      sellingPrice: parseFloat(cols[iSell] ?? "0") || 0,
      reorderLevel: parseInt(cols[iReorder] ?? "5", 10) || 5,
      barcode,
    };
  });
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

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    enabled: open,
  });
  // Strip leading emoji so the hint and template use plain text names (Excel-safe)
  const categoryNames = (categories ?? []).map((c) => stripLeadingEmoji(c.name));

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
        // Strip UTF-8 BOM if present (added by our own template or Excel when saving CSV)
        let text = (e.target?.result as string).replace(/^﻿/, "");
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
    reader.readAsText(file, "utf-8");
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
          <Button variant="outline" size="sm" className="self-start" onClick={() => downloadTemplate(categoryNames)}>
            <Download className="me-1.5 size-4" />
            {t("importProductsDialog.downloadTemplate")}
          </Button>

          {/* Category hint */}
          {categoryNames.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{t("importProductsDialog.availableCategories")}: </span>
              {categoryNames.join(", ")}
            </p>
          )}

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
