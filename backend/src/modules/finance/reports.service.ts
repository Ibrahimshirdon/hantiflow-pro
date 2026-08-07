import { db } from "../../config/firebase.js";
import type { SalesOrder } from "../../shared/types/sales.types.js";
import type { Product } from "../../shared/types/inventory.types.js";
import type { Expense, OtherIncome } from "../../shared/types/finance.types.js";
import type { Loan } from "../../shared/types/loan.types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

interface DateRange {
  dateFrom: Date;
  dateTo: Date;
}

// Filters by a single equality field (status) only, then narrows by date
// range in memory, rather than combining an equality + range filter in one
// Firestore query — avoids needing yet another composite index for what's
// fundamentally a reporting query over a bounded, thesis-scale dataset.
async function getCompletedSalesInRange({ dateFrom, dateTo }: DateRange): Promise<SalesOrder[]> {
  const snap = await db.collection("salesOrders").where("status", "==", "completed").get();
  const from = dateFrom.getTime();
  const to = dateTo.getTime();
  return snap.docs
    .map((d) => d.data() as SalesOrder)
    .filter((o) => {
      const ms = o.createdAt.toMillis();
      return ms >= from && ms <= to;
    });
}

async function getExpensesInRange({ dateFrom, dateTo }: DateRange): Promise<Expense[]> {
  const snap = await db
    .collection("expenses")
    .where("date", ">=", dateFrom)
    .where("date", "<=", dateTo)
    .get();
  return snap.docs.map((d) => d.data() as Expense);
}

async function getOtherIncomeInRange({ dateFrom, dateTo }: DateRange): Promise<OtherIncome[]> {
  const snap = await db
    .collection("otherIncome")
    .where("date", ">=", dateFrom)
    .where("date", "<=", dateTo)
    .get();
  return snap.docs.map((d) => d.data() as OtherIncome);
}

async function getCostOfGoodsSold(orders: SalesOrder[]): Promise<number> {
  const productIds = new Set<string>();
  orders.forEach((o) => o.items.forEach((item) => productIds.add(item.productId)));
  if (productIds.size === 0) return 0;

  const snaps = await Promise.all(
    [...productIds].map((id) => db.collection("products").doc(id).get()),
  );
  const costById = new Map<string, number>();
  snaps.forEach((snap) => {
    if (snap.exists) costById.set(snap.id, (snap.data() as Product).costPrice);
  });

  let cogs = 0;
  orders.forEach((o) => {
    o.items.forEach((item) => {
      cogs += item.quantity * (costById.get(item.productId) ?? 0);
    });
  });
  return cogs;
}

// Total money currently owed to the business across every outstanding
// customer loan — a point-in-time balance (how much credit is out there
// right now), not a period flow, so unlike the rest of this summary it
// deliberately ignores the date range: a loan issued two months ago that's
// still unpaid is just as relevant to "how much do we have out on credit"
// as one issued yesterday.
async function getOutstandingLoansTotal(): Promise<number> {
  const snap = await db.collection("loans").where("status", "==", "outstanding").get();
  const total = snap.docs.reduce((sum, d) => sum + (d.data() as Loan).balanceRemaining, 0);
  return round2(total);
}

export async function getFinancialSummary(range: DateRange) {
  const [sales, expenses, otherIncome, outstandingLoans] = await Promise.all([
    getCompletedSalesInRange(range),
    getExpensesInRange(range),
    getOtherIncomeInRange(range),
    getOutstandingLoansTotal(),
  ]);
  const cogs = await getCostOfGoodsSold(sales);

  const salesRevenue = round2(sales.reduce((sum, o) => sum + o.grandTotal, 0));
  const otherIncomeTotal = round2(otherIncome.reduce((sum, i) => sum + i.amount, 0));
  const totalRevenue = round2(salesRevenue + otherIncomeTotal);
  const totalExpenses = round2(expenses.reduce((sum, e) => sum + e.amount, 0));
  const grossProfit = round2(salesRevenue - cogs);
  const netProfit = round2(totalRevenue - cogs - totalExpenses);
  // Cash actually collected minus cash actually paid out over the range —
  // same "cashIn - cashOut" the Cash Flow chart plots per day, just
  // totaled across the whole period. Deliberately excludes COGS: cost of
  // goods sold is an accounting valuation of inventory already on hand,
  // not itself a cash movement recorded in this range.
  const cashOnHand = round2(totalRevenue - totalExpenses);

  const expensesByCategory = new Map<string, number>();
  expenses.forEach((e) => {
    expensesByCategory.set(e.category, round2((expensesByCategory.get(e.category) ?? 0) + e.amount));
  });

  return {
    salesRevenue,
    otherIncomeTotal,
    totalRevenue,
    costOfGoodsSold: round2(cogs),
    totalExpenses,
    grossProfit,
    netProfit,
    cashOnHand,
    outstandingLoans,
    orderCount: sales.length,
    expensesByCategory: Array.from(expensesByCategory, ([category, amount]) => ({ category, amount })),
  };
}

export async function getCashFlow(range: DateRange) {
  const [sales, expenses, otherIncome] = await Promise.all([
    getCompletedSalesInRange(range),
    getExpensesInRange(range),
    getOtherIncomeInRange(range),
  ]);

  const byDate = new Map<string, { cashIn: number; cashOut: number }>();
  function bucket(key: string) {
    if (!byDate.has(key)) byDate.set(key, { cashIn: 0, cashOut: 0 });
    return byDate.get(key)!;
  }

  sales.forEach((o) => {
    bucket(dateKey(o.createdAt.toMillis())).cashIn += o.grandTotal;
  });
  otherIncome.forEach((i) => {
    bucket(dateKey(i.date.toMillis())).cashIn += i.amount;
  });
  expenses.forEach((e) => {
    bucket(dateKey(e.date.toMillis())).cashOut += e.amount;
  });

  return Array.from(byDate, ([date, { cashIn, cashOut }]) => ({
    date,
    cashIn: round2(cashIn),
    cashOut: round2(cashOut),
    net: round2(cashIn - cashOut),
  })).sort((a, b) => a.date.localeCompare(b.date));
}
