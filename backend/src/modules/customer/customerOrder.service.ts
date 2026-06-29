import { env } from "../../config/env.js";
import { AppError } from "../../shared/utils/AppError.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import {
  createSalesOrder,
  getInvoiceForOrder,
  getReceiptForOrder,
  getSalesOrderById,
  listSalesOrders,
} from "../sales/salesOrder.service.js";
import { createDelivery } from "../delivery/delivery.service.js";
import type { CustomerCheckoutInput } from "./customerOrder.types.js";

export function getDeliveryFee() {
  return env.deliveryFee;
}

export async function customerCheckout(
  customerId: string,
  input: CustomerCheckoutInput,
  actor: AuthenticatedUser,
) {
  const deliveryFee = input.fulfillmentType === "delivery" ? env.deliveryFee : 0;

  const result = await createSalesOrder(
    {
      customerId,
      items: input.items,
      discountCode: input.discountCode,
      paymentMethod: input.paymentMethod,
    },
    actor,
    "online",
    {
      fulfillmentType: input.fulfillmentType,
      deliveryFee,
      deliveryAddress: input.deliveryAddress,
    },
  );

  // Delivery orders go straight onto the Dispatch Board as soon as they're
  // placed — staff shouldn't have to remember to manually create one for
  // every online order. The order itself stays "pending" until the
  // assigned driver actually marks this delivery "delivered".
  if (input.fulfillmentType === "delivery" && input.deliveryAddress) {
    await createDelivery(
      {
        salesOrderId: result.id,
        pickupAddress: env.storePickupAddress,
        dropoffAddress: input.deliveryAddress,
      },
      actor,
    );
  }

  const fulfillmentMessage =
    input.fulfillmentType === "delivery"
      ? "Your order has been placed and is awaiting dispatch."
      : "Your order has been placed and is being prepared.";

  await createNotification({
    userId: customerId,
    title: "Order placed",
    message:
      input.paymentMethod === "loan"
        ? `${fulfillmentMessage} This order was financed as a loan against your account.`
        : fulfillmentMessage,
    type: "order",
    relatedEntityId: result.id,
  });

  return result;
}

export async function listMyOrders(customerId: string) {
  return listSalesOrders({ customerId });
}

async function assertOwnership(orderId: string, customerId: string) {
  const order = await getSalesOrderById(orderId);
  if (order.customerId !== customerId) {
    throw new AppError(403, "This order does not belong to you");
  }
  return order;
}

export async function getMyOrder(orderId: string, customerId: string) {
  return assertOwnership(orderId, customerId);
}

export async function getMyInvoice(orderId: string, customerId: string) {
  await assertOwnership(orderId, customerId);
  return getInvoiceForOrder(orderId);
}

export async function getMyReceipt(orderId: string, customerId: string) {
  await assertOwnership(orderId, customerId);
  return getReceiptForOrder(orderId);
}
