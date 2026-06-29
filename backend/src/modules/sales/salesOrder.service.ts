import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { counterRef, formatSequence, readCounterValue } from "../../shared/utils/counters.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Batch, Product } from "../../shared/types/inventory.types.js";
import type { Address, CustomerProfile } from "../../shared/types/user.types.js";
import type { Discount, SalesOrder, SalesOrderItem, TaxRate } from "../../shared/types/sales.types.js";
import { computeDiscountAmount, isDiscountCurrentlyValid } from "./discount.service.js";
import type { CreateSalesOrderInput } from "./salesOrder.types.js";
import { notifyIfNewlyLowStock } from "../inventory/lowStockAlert.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface BatchDeduction {
  batchRef: FirebaseFirestore.DocumentReference;
  newQuantity: number;
  willBeDepleted: boolean;
}

function planFifoDeduction(batches: Batch[], quantityNeeded: number, batchRefs: FirebaseFirestore.DocumentReference[]) {
  const sorted = batches
    .map((batch, index) => ({ batch, ref: batchRefs[index]! }))
    .sort((a, b) => {
      const aTime = a.batch.expiryDate?.toMillis() ?? Infinity;
      const bTime = b.batch.expiryDate?.toMillis() ?? Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return a.batch.receivedDate.toMillis() - b.batch.receivedDate.toMillis();
    });

  const deductions: BatchDeduction[] = [];
  let remaining = quantityNeeded;
  for (const { batch, ref } of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;
    remaining -= take;
    deductions.push({ batchRef: ref, newQuantity: batch.quantity - take, willBeDepleted: batch.quantity - take === 0 });
  }

  if (remaining > 0) {
    return null;
  }
  return deductions;
}

export async function createSalesOrder(
  input: CreateSalesOrderInput,
  actor: AuthenticatedUser,
  orderType: "pos" | "online" = "pos",
  fulfillment: { fulfillmentType?: "pickup" | "delivery"; deliveryFee?: number; deliveryAddress?: Address } = {},
) {
  // Only an online order with delivery fulfillment waits for an actual
  // driver to deliver it before counting as "completed" — pos sales and
  // online pickup orders are fulfilled the moment they're created, same as
  // every order before this distinction existed.
  const isOnlineDelivery = orderType === "online" && fulfillment.fulfillmentType === "delivery";

  const orderRef = db.collection("salesOrders").doc();
  const invoiceRef = db.collection("invoices").doc();
  const receiptRef = db.collection("receipts").doc();

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const createdByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  // Consolidate duplicate product lines up front. Without this, two FIFO
  // depletion plans for the same product could both read the same
  // pre-transaction batch quantity and overwrite each other's deduction on
  // write (last write wins), silently under-depleting stock.
  const mergedQuantities = new Map<string, number>();
  for (const item of input.items) {
    mergedQuantities.set(item.productId, (mergedQuantities.get(item.productId) ?? 0) + item.quantity);
  }
  const orderItems = Array.from(mergedQuantities, ([productId, quantity]) => ({ productId, quantity }));

  const lowStockTransitions: Parameters<typeof notifyIfNewlyLowStock>[0] = [];

  await db.runTransaction(async (tx) => {
    // ---------- READ PHASE ----------
    const productRefs = orderItems.map((item) => db.collection("products").doc(item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const products = productSnaps.map((snap, i) => {
      if (!snap.exists) throw new AppError(404, `Product ${orderItems[i]!.productId} not found`);
      return snap.data() as Product;
    });

    const batchQueries = orderItems.map((item) =>
      db
        .collection("batches")
        .where("productId", "==", item.productId)
        .where("status", "==", "active"),
    );
    const batchSnaps = await Promise.all(batchQueries.map((q) => tx.get(q)));

    const taxRateIds = [...new Set(products.map((p) => p.taxRateId).filter((id): id is string => !!id))];
    const taxRateSnaps = await Promise.all(
      taxRateIds.map((id) => tx.get(db.collection("taxRates").doc(id))),
    );
    const taxRateById = new Map<string, number>();
    taxRateIds.forEach((id, i) => {
      const snap = taxRateSnaps[i]!;
      taxRateById.set(id, snap.exists ? (snap.data() as TaxRate).rate : 0);
    });

    let discountSnapDoc: { id: string; data: Discount } | null = null;
    if (input.discountCode) {
      const discountSnap = await tx.get(
        db.collection("discounts").where("code", "==", input.discountCode.toUpperCase()).limit(1),
      );
      if (discountSnap.empty) throw new AppError(404, "Invalid discount code");
      const doc = discountSnap.docs[0]!;
      discountSnapDoc = { id: doc.id, data: doc.data() as Discount };
    }

    let customerProfileRef: FirebaseFirestore.DocumentReference | null = null;
    let customerProfile: CustomerProfile | null = null;
    let customerName: string | null = null;
    if (input.customerId) {
      const [profileSnap, userSnap] = await Promise.all([
        tx.get(db.collection("customerProfiles").doc(input.customerId)),
        tx.get(db.collection("users").doc(input.customerId)),
      ]);
      if (!profileSnap.exists || !userSnap.exists) {
        throw new AppError(404, "Customer not found");
      }
      customerProfileRef = profileSnap.ref;
      customerProfile = profileSnap.data() as CustomerProfile;
      customerName = (userSnap.data() as { displayName: string }).displayName;
    }

    if (input.paymentMethod === "wallet" && !input.customerId) {
      throw new AppError(400, "Wallet payment requires a customer");
    }
    if (input.paymentMethod === "loan" && !input.customerId) {
      throw new AppError(400, "Loan payment requires a customer");
    }

    const orderNumberCurrent = await readCounterValue(tx, "orderNumber");
    const invoiceNumberCurrent = await readCounterValue(tx, "invoiceNumber");
    const receiptNumberCurrent = await readCounterValue(tx, "receiptNumber");

    // ---------- COMPUTE PHASE ----------
    const batchDeductionsPerItem: (BatchDeduction[] | null)[] = [];
    const items: SalesOrderItem[] = orderItems.map((item, i) => {
      const product = products[i]!;
      if (!product.isActive) {
        throw new AppError(400, `Product ${product.name} is not active`);
      }
      const batches = batchSnaps[i]!.docs.map((d) => d.data() as Batch);
      const batchRefs = batchSnaps[i]!.docs.map((d) => d.ref);
      const deductions = planFifoDeduction(batches, item.quantity, batchRefs);
      if (!deductions) {
        throw new AppError(
          400,
          `Insufficient stock for ${product.name}: requested ${item.quantity}, available ${batches.reduce((s, b) => s + b.quantity, 0)}`,
        );
      }
      batchDeductionsPerItem.push(deductions);

      const taxRate = product.taxRateId ? taxRateById.get(product.taxRateId) ?? 0 : 0;
      const lineTotal = round2(item.quantity * product.sellingPrice);
      return {
        productId: item.productId,
        productName: product.name,
        batchId: null,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        discountAmount: 0,
        taxRate,
        lineTotal,
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));

    let discountTotal = 0;
    if (discountSnapDoc) {
      if (!isDiscountCurrentlyValid(discountSnapDoc.data)) {
        throw new AppError(400, "This discount code is not currently valid");
      }
      discountTotal = round2(
        computeDiscountAmount(
          discountSnapDoc.data,
          items.map((item, i) => ({
            productId: item.productId,
            categoryId: products[i]!.categoryId,
            lineSubtotal: item.lineTotal,
          })),
        ),
      );
      if (discountTotal === 0) {
        throw new AppError(400, "Order does not meet the requirements for this discount code");
      }
    }

    let taxTotal = 0;
    for (const item of items) {
      const discountShare = subtotal > 0 ? (item.lineTotal / subtotal) * discountTotal : 0;
      item.discountAmount = round2(discountShare);
      const taxableAmount = item.lineTotal - discountShare;
      taxTotal += taxableAmount * item.taxRate;
    }
    taxTotal = round2(taxTotal);

    const deliveryFee = fulfillment.deliveryFee ?? 0;
    const grandTotal = round2(subtotal - discountTotal + taxTotal + deliveryFee);

    if (input.paymentMethod === "wallet") {
      if (!customerProfile || customerProfile.walletBalance < grandTotal) {
        throw new AppError(400, "Insufficient wallet balance");
      }
    }

    // Choosing "loan" doesn't put the whole order on credit — any existing
    // wallet balance is applied first, and only the shortfall (if any) is
    // actually borrowed. If the wallet alone covers it, no Loan doc is
    // created at all; this mirrors the user's own framing: "deducted from
    // his wallet whatever balance is there, [and] if there [is] no more
    // balance remain[ing], the loan [covers] there[st]."
    let loanWalletContribution = 0;
    let loanPortion = 0;
    if (input.paymentMethod === "loan") {
      if (!customerProfile) {
        throw new AppError(400, "Loan payment requires a customer");
      }
      loanWalletContribution = round2(Math.min(customerProfile.walletBalance ?? 0, grandTotal));
      loanPortion = round2(grandTotal - loanWalletContribution);
      const availableCredit = round2(
        (customerProfile.creditLimit ?? 0) - (customerProfile.outstandingLoanBalance ?? 0),
      );
      if (loanPortion > availableCredit) {
        throw new AppError(
          400,
          `Insufficient credit limit — available $${availableCredit.toFixed(2)}, ` +
            `$${loanPortion.toFixed(2)} would need to be borrowed after applying your ` +
            `$${loanWalletContribution.toFixed(2)} wallet balance`,
        );
      }
    }

    const orderNumber = formatSequence(orderNumberCurrent + 1, "SO");
    const invoiceNumber = formatSequence(invoiceNumberCurrent + 1, "INV");
    const receiptNumber = formatSequence(receiptNumberCurrent + 1, "RCT");

    // ---------- WRITE PHASE ----------
    batchDeductionsPerItem.forEach((deductions) => {
      deductions!.forEach((deduction) => {
        tx.update(deduction.batchRef, {
          quantity: deduction.newQuantity,
          status: deduction.willBeDepleted ? "depleted" : "active",
        });
      });
    });

    orderItems.forEach((item, i) => {
      const product = products[i]!;
      const newTotalStock = product.totalStock - item.quantity;
      const newIsLowStock = newTotalStock <= product.reorderLevel;
      tx.update(productRefs[i]!, {
        totalStock: newTotalStock,
        isLowStock: newIsLowStock,
        updatedAt: FieldValue.serverTimestamp(),
      });
      lowStockTransitions.push({
        productId: item.productId,
        productName: product.name,
        wasLowStock: product.isLowStock,
        isLowStock: newIsLowStock,
        totalStock: newTotalStock,
        reorderLevel: product.reorderLevel,
        maxStockLevel: product.maxStockLevel,
      });
    });

    if (discountSnapDoc) {
      tx.update(db.collection("discounts").doc(discountSnapDoc.id), {
        usedCount: FieldValue.increment(1),
      });
    }

    let walletTransactionRef: FirebaseFirestore.DocumentReference | null = null;
    if (input.paymentMethod === "wallet" && customerProfileRef && customerProfile) {
      const newBalance = round2(customerProfile.walletBalance - grandTotal);
      tx.update(customerProfileRef, { walletBalance: newBalance });
      walletTransactionRef = db.collection("walletTransactions").doc();
      tx.set(walletTransactionRef, {
        customerId: input.customerId,
        type: "debit",
        amount: grandTotal,
        reason: "purchase",
        relatedOrderId: orderRef.id,
        balanceAfter: newBalance,
        performedBy: null,
        performedByName: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    let loanRef: FirebaseFirestore.DocumentReference | null = null;
    if (input.paymentMethod === "loan" && customerProfileRef && customerProfile) {
      const profileUpdates: Record<string, number> = {};
      if (loanWalletContribution > 0) {
        profileUpdates.walletBalance = round2(customerProfile.walletBalance - loanWalletContribution);
      }
      if (loanPortion > 0) {
        profileUpdates.outstandingLoanBalance = round2(
          (customerProfile.outstandingLoanBalance ?? 0) + loanPortion,
        );
      }
      if (Object.keys(profileUpdates).length > 0) {
        tx.update(customerProfileRef, profileUpdates);
      }

      if (loanWalletContribution > 0) {
        tx.set(db.collection("walletTransactions").doc(), {
          customerId: input.customerId,
          type: "debit",
          amount: loanWalletContribution,
          reason: "purchase",
          relatedOrderId: orderRef.id,
          balanceAfter: profileUpdates.walletBalance ?? customerProfile.walletBalance,
          performedBy: null,
          performedByName: null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      if (loanPortion > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        loanRef = db.collection("loans").doc();
        tx.set(loanRef, {
          customerId: input.customerId,
          customerName,
          salesOrderId: orderRef.id,
          orderNumber,
          principalAmount: loanPortion,
          amountRepaid: 0,
          balanceRemaining: loanPortion,
          status: "outstanding",
          dueDate,
          overdueNotifiedAt: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    tx.set(counterRef("orderNumber"), { name: "orderNumber", lastValue: orderNumberCurrent + 1 });
    tx.set(counterRef("invoiceNumber"), { name: "invoiceNumber", lastValue: invoiceNumberCurrent + 1 });
    tx.set(counterRef("receiptNumber"), { name: "receiptNumber", lastValue: receiptNumberCurrent + 1 });

    const orderData = {
      orderNumber,
      type: orderType,
      customerId: input.customerId ?? null,
      customerName,
      items,
      subtotal,
      discountTotal,
      taxTotal,
      fulfillmentType: fulfillment.fulfillmentType ?? null,
      deliveryFee,
      deliveryAddress: fulfillment.deliveryAddress ?? null,
      grandTotal,
      paymentStatus: "paid" as const,
      paymentMethod: input.paymentMethod,
      status: isOnlineDelivery ? ("pending" as const) : ("completed" as const),
      createdBy: actor.uid,
      createdByName,
      createdByRole: actor.role,
      completedBy: isOnlineDelivery ? null : actor.uid,
      completedByName: isOnlineDelivery ? null : createdByName,
      completedAt: isOnlineDelivery ? null : FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.set(orderRef, orderData);

    tx.set(invoiceRef, {
      invoiceNumber,
      salesOrderId: orderRef.id,
      customerId: input.customerId ?? null,
      itemsSnapshot: items,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      status: "paid",
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(receiptRef, {
      receiptNumber,
      salesOrderId: orderRef.id,
      amountPaid: grandTotal,
      paymentMethod: input.paymentMethod,
      changeGiven: 0,
      issuedBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await notifyIfNewlyLowStock(lowStockTransitions);

  return { id: orderRef.id, invoiceId: invoiceRef.id, receiptId: receiptRef.id };
}

export async function listSalesOrders(filters: {
  customerId?: string;
  status?: string;
  createdBy?: string;
}) {
  let query: FirebaseFirestore.Query = db.collection("salesOrders");
  if (filters.customerId) query = query.where("customerId", "==", filters.customerId);
  if (filters.status) query = query.where("status", "==", filters.status);
  if (filters.createdBy) query = query.where("createdBy", "==", filters.createdBy);
  const snap = await query.get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesOrder);
  return orders.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getSalesOrderById(id: string) {
  const snap = await db.collection("salesOrders").doc(id).get();
  if (!snap.exists) {
    throw new AppError(404, "Sales order not found");
  }
  return { id: snap.id, ...snap.data() } as SalesOrder;
}

// Called when a delivery actually gets marked "delivered" — flips the
// pending online-delivery order over to completed, attributing it to
// whoever delivered it (the driver) rather than the customer who placed it.
export async function markOrderCompleted(id: string, actor: AuthenticatedUser) {
  const ref = db.collection("salesOrders").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Sales order not found");
  }
  const order = snap.data() as SalesOrder;
  if (order.status !== "pending") {
    return;
  }

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const completedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  await ref.update({
    status: "completed",
    completedBy: actor.uid,
    completedByName,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getInvoiceForOrder(orderId: string) {
  const snap = await db.collection("invoices").where("salesOrderId", "==", orderId).limit(1).get();
  if (snap.empty) {
    throw new AppError(404, "Invoice not found");
  }
  const doc = snap.docs[0]!;
  return { id: doc.id, ...doc.data() };
}

export async function getReceiptForOrder(orderId: string) {
  const snap = await db.collection("receipts").where("salesOrderId", "==", orderId).limit(1).get();
  if (snap.empty) {
    throw new AppError(404, "Receipt not found");
  }
  const doc = snap.docs[0]!;
  return { id: doc.id, ...doc.data() };
}
