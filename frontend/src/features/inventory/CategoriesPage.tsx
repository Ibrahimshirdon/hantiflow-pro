import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createCategory, listCategories, updateCategory } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import type { Category } from "@/types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CategoriesPage() {
  const { t } = useTranslation(["inventory", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success(t("categoriesPage.toasts.created"));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setDescription("");
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCategory(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateCategory(editing!.id, { name: editName, description: editDescription || undefined }),
    onSuccess: () => {
      toast.success(t("categoriesPage.toasts.updated"));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditing(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openEdit(category: Category) {
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setEditing(category);
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    editMutation.mutate();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({ name, description: description || undefined });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("categoriesPage.title")}</h1>
          <p className="text-muted-foreground">{t("categoriesPage.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t("categoriesPage.newCategory")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("categoriesPage.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t("common:fields.name")}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">{t("categoriesPage.descriptionOptional")}</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("common:actions.saving") : t("common:actions.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("common:fields.description")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && categories?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t("categoriesPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {categories?.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground">{category.description ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? "success" : "secondary"}>
                  {category.isActive ? t("common:status.active") : t("common:status.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                    {t("common:actions.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={toggleActiveMutation.isPending}
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: category.id, isActive: !category.isActive })
                    }
                  >
                    {category.isActive ? t("categoriesPage.deactivate") : t("categoriesPage.activate")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categoriesPage.editDialogTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editName">{t("common:fields.name")}</Label>
              <Input
                id="editName"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editDescription">{t("categoriesPage.descriptionOptional")}</Label>
              <Input
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
