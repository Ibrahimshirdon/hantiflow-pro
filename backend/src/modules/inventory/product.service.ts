import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { uploadBuffer } from "../../shared/utils/uploadFile.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Product } from "../../shared/types/inventory.types.js";
import type { UpdateProductInput } from "./product.types.js";
import { notifyIfNewlyLowStock } from "./lowStockAlert.js";

const collection = () => db.collection("products");

async function getCategoryName(categoryId: string): Promise<string> {
  const snap = await db.collection("categories").doc(categoryId).get();
  if (!snap.exists) {
    throw new AppError(400, "Category not found");
  }
  return (snap.data() as { name: string }).name;
}

export async function listProducts(filters: {
  categoryId?: string;
  lowStockOnly?: boolean;
  availableForSale?: boolean;
}) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.categoryId) {
    query = query.where("categoryId", "==", filters.categoryId);
  }
  if (filters.lowStockOnly) {
    query = query.where("isLowStock", "==", true);
  }
  const snap = await query.orderBy("name").get();
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  // A product with no price set yet (sellingPrice 0), or a supplier
  // submission still awaiting admin approval, shouldn't be purchasable —
  // POS/storefront listings filter both out via this flag.
  return filters.availableForSale
    ? products.filter((p) => p.sellingPrice > 0 && p.approvalStatus === "approved")
    : products;
}

export async function getProductById(id: string) {
  const snap = await collection().doc(id).get();
  if (!snap.exists) {
    throw new AppError(404, "Product not found");
  }
  return { id: snap.id, ...snap.data() } as Product;
}

export async function getProductByBarcode(barcode: string) {
  const snap = await collection().where("barcode", "==", barcode).limit(1).get();
  if (snap.empty) {
    throw new AppError(404, "No product matches this barcode");
  }
  const doc = snap.docs[0]!;
  return { id: doc.id, ...doc.data() } as Product;
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Product not found");
  }
  const current = snap.data() as Product;

  const updates: Record<string, unknown> = { ...input, updatedAt: FieldValue.serverTimestamp() };
  if (input.categoryId) {
    updates.categoryName = await getCategoryName(input.categoryId);
  }
  let newIsLowStock = current.isLowStock;
  if (input.reorderLevel !== undefined) {
    newIsLowStock = current.totalStock <= input.reorderLevel;
    updates.isLowStock = newIsLowStock;
  }

  await ref.update(updates);

  await notifyIfNewlyLowStock([
    {
      productId: id,
      productName: current.name,
      wasLowStock: current.isLowStock,
      isLowStock: newIsLowStock,
      totalStock: current.totalStock,
      reorderLevel: input.reorderLevel ?? current.reorderLevel,
      maxStockLevel: input.maxStockLevel ?? current.maxStockLevel,
    },
  ]);

  return { id };
}

export async function uploadProductImage(id: string, fileBuffer: Buffer) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Product not found");
  }
  const url = await uploadBuffer(fileBuffer, { folder: "products", resourceType: "image" });
  await ref.update({ images: FieldValue.arrayUnion(url), updatedAt: FieldValue.serverTimestamp() });
  return { url };
}

// Final gate for supplier-sourced products: created with approvalStatus
// "pending" (invisible to POS/shop/availableForSale listings) until an admin
// reviews and approves them here. Hand-created (admin/staff) products skip
// this entirely since createProduct already marks them "approved".
export async function approveProduct(id: string, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Product not found");
  }
  const product = snap.data() as Product;
  if (product.approvalStatus === "approved") {
    throw new AppError(400, "Product is already approved");
  }

  await ref.update({ approvalStatus: "approved", updatedAt: FieldValue.serverTimestamp() });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "PRODUCT_APPROVED",
    entityType: "product",
    entityId: id,
    after: { name: product.name },
  });

  if (product.supplierProductId) {
    const supplierProductSnap = await db.collection("supplierProducts").doc(product.supplierProductId).get();
    if (supplierProductSnap.exists) {
      const supplierProduct = supplierProductSnap.data() as { supplierId: string };
      await createNotification({
        userId: supplierProduct.supplierId,
        title: "Product approved",
        message: `Your product "${product.name}" has been approved and is now live for sale.`,
        type: "system",
        relatedEntityId: id,
      });
    }
  }

  return { id };
}

export async function deleteProduct(id: string, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Product not found");
  }
  const product = snap.data() as Product;

  if (product.totalStock > 0) {
    throw new AppError(
      400,
      "Cannot delete a product that still has stock on hand — adjust stock to zero first or deactivate it instead",
    );
  }

  await ref.delete();

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "PRODUCT_DELETED",
    entityType: "product",
    entityId: id,
    before: { sku: product.sku, name: product.name },
  });

  return { id };
}
