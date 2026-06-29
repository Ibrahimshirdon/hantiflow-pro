import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { SupplierCompany } from "../../shared/types/supplier.types.js";
import type { CreateSupplierCompanyInput, UpdateSupplierCompanyInput } from "./supplierCompany.types.js";

const collection = () => db.collection("supplierCompanies");

export async function createSupplierCompany(input: CreateSupplierCompanyInput, actor: AuthenticatedUser) {
  const ref = collection().doc();
  await ref.set({
    supplierId: actor.uid,
    name: input.name,
    description: input.description ?? null,
    location: input.location,
    managerName: input.managerName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    registrationDate: input.registrationDate ?? FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

export async function listSupplierCompanies(filters: { supplierId?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.supplierId) {
    query = query.where("supplierId", "==", filters.supplierId);
  }
  const snap = await query.get();
  const companies = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SupplierCompany);
  return companies.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getSupplierCompanyById(id: string) {
  const snap = await collection().doc(id).get();
  if (!snap.exists) {
    throw new AppError(404, "Company not found");
  }
  return { id: snap.id, ...snap.data() } as SupplierCompany;
}

async function getOwnedCompany(id: string, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Company not found");
  }
  const company = snap.data() as SupplierCompany;
  if (company.supplierId !== actor.uid) {
    throw new AppError(403, "You can only manage your own companies");
  }
  return { ref, company };
}

export async function updateSupplierCompany(
  id: string,
  input: UpdateSupplierCompanyInput,
  actor: AuthenticatedUser,
) {
  const { ref } = await getOwnedCompany(id, actor);
  await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return { id };
}

export async function deleteSupplierCompany(id: string, actor: AuthenticatedUser) {
  await getOwnedCompany(id, actor);

  const productsSnap = await db
    .collection("supplierProducts")
    .where("companyId", "==", id)
    .limit(1)
    .get();
  if (!productsSnap.empty) {
    throw new AppError(
      400,
      "Cannot delete a company that still has products under it — delete or reassign those products first",
    );
  }

  await collection().doc(id).delete();
  return { id };
}
