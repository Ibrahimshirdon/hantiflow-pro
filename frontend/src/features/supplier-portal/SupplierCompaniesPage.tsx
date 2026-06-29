import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  createSupplierCompany,
  deleteSupplierCompany,
  listSupplierCompanies,
  updateSupplierCompany,
  type CreateSupplierCompanyInput,
} from "@/api/supplier.api";
import { getApiErrorMessage } from "@/api/client";
import type { SupplierCompany } from "@/types/supplier.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const EMPTY_FORM: CreateSupplierCompanyInput = {
  name: "",
  description: "",
  location: "",
  managerName: "",
  contactPhone: "",
  contactEmail: "",
};

export function SupplierCompaniesPage() {
  const { t } = useTranslation(["supplierPortal", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierCompany | null>(null);
  const [deleting, setDeleting] = useState<SupplierCompany | null>(null);
  const [form, setForm] = useState<CreateSupplierCompanyInput>(EMPTY_FORM);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["supplierCompanies", "mine"],
    queryFn: () => listSupplierCompanies(),
  });

  const createMutation = useMutation({
    mutationFn: createSupplierCompany,
    onSuccess: () => {
      toast.success(t("companiesPage.toasts.created"));
      queryClient.invalidateQueries({ queryKey: ["supplierCompanies"] });
      setForm(EMPTY_FORM);
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateSupplierCompany(editing!.id, form),
    onSuccess: () => {
      toast.success(t("companiesPage.toasts.updated"));
      queryClient.invalidateQueries({ queryKey: ["supplierCompanies"] });
      setEditing(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupplierCompany(deleting!.id),
    onSuccess: () => {
      toast.success(t("companiesPage.toasts.deleted"));
      queryClient.invalidateQueries({ queryKey: ["supplierCompanies"] });
      setDeleting(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openEdit(company: SupplierCompany) {
    setForm({
      name: company.name,
      description: company.description ?? "",
      location: company.location,
      managerName: company.managerName,
      contactPhone: company.contactPhone,
      contactEmail: company.contactEmail,
    });
    setEditing(company);
  }

  function handleOpenChange(next: boolean) {
    if (next) setForm(EMPTY_FORM);
    setOpen(next);
  }

  function handleCreateSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(form);
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("companiesPage.title")}</h1>
          <p className="text-muted-foreground">{t("companiesPage.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>{t("companiesPage.newCompany")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("companiesPage.createDialog.title")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t("companiesPage.fields.companyName")}</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">{t("companiesPage.fields.descriptionOptional")}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">{t("companiesPage.fields.location")}</Label>
                <Input
                  id="location"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="managerName">{t("companiesPage.fields.managerName")}</Label>
                <Input
                  id="managerName"
                  required
                  value={form.managerName}
                  onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactPhone">{t("companiesPage.fields.contactPhone")}</Label>
                  <Input
                    id="contactPhone"
                    required
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactEmail">{t("companiesPage.fields.contactEmail")}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    required
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? t("companiesPage.createDialog.creating")
                    : t("companiesPage.createDialog.submit")}
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
            <TableHead>{t("companiesPage.fields.location")}</TableHead>
            <TableHead>{t("companiesPage.fields.manager")}</TableHead>
            <TableHead>{t("companiesPage.table.contact")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && companies?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("companiesPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {companies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell className="text-muted-foreground">{company.location}</TableCell>
              <TableCell className="text-muted-foreground">{company.managerName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {company.contactPhone} · {company.contactEmail}
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                    {t("common:actions.edit")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleting(company)}>
                    {t("common:actions.delete")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("companiesPage.editDialog.title", { name: editing?.name })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">{t("companiesPage.fields.companyName")}</Label>
              <Input
                id="edit-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">{t("companiesPage.fields.descriptionOptional")}</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-location">{t("companiesPage.fields.location")}</Label>
              <Input
                id="edit-location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-managerName">{t("companiesPage.fields.managerName")}</Label>
              <Input
                id="edit-managerName"
                required
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-contactPhone">{t("companiesPage.fields.contactPhone")}</Label>
                <Input
                  id="edit-contactPhone"
                  required
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-contactEmail">{t("companiesPage.fields.contactEmail")}</Label>
                <Input
                  id="edit-contactEmail"
                  type="email"
                  required
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("common:actions.saving") : t("companiesPage.editDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("companiesPage.deleteDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("companiesPage.deleteDialog.bodyPrefix")} <strong>{deleting?.name}</strong>
            {t("companiesPage.deleteDialog.bodySuffix")}
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending
                ? t("common:actions.deleting")
                : t("companiesPage.deleteDialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
