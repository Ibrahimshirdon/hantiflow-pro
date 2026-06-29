import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listCategories } from "@/api/inventory.api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SupplierCategoriesPage() {
  const { t } = useTranslation(["supplierPortal", "common"]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("categoriesPage.title")}</h1>
        <p className="text-muted-foreground">{t("categoriesPage.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("common:fields.description")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && categories?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("categoriesPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {categories
            ?.filter((category) => category.isActive)
            .map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.description ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="success">{t("common:status.active")}</Badge>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
