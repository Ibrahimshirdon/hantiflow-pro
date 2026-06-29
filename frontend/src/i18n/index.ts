import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enAccount from "./locales/en/account.json";
import enAnalytics from "./locales/en/analytics.json";
import enInventory from "./locales/en/inventory.json";
import enSales from "./locales/en/sales.json";
import enCustomerPortal from "./locales/en/customerPortal.json";
import enSuppliers from "./locales/en/suppliers.json";
import enCustomers from "./locales/en/customers.json";
import enSupplierPortal from "./locales/en/supplierPortal.json";
import enDelivery from "./locales/en/delivery.json";
import enDriverPortal from "./locales/en/driverPortal.json";
import enFinance from "./locales/en/finance.json";
import enHr from "./locales/en/hr.json";
import enSecurity from "./locales/en/security.json";
import enReports from "./locales/en/reports.json";

import soCommon from "./locales/so/common.json";
import soAuth from "./locales/so/auth.json";
import soAccount from "./locales/so/account.json";
import soAnalytics from "./locales/so/analytics.json";
import soInventory from "./locales/so/inventory.json";
import soSales from "./locales/so/sales.json";
import soCustomerPortal from "./locales/so/customerPortal.json";
import soSuppliers from "./locales/so/suppliers.json";
import soCustomers from "./locales/so/customers.json";
import soSupplierPortal from "./locales/so/supplierPortal.json";
import soDelivery from "./locales/so/delivery.json";
import soDriverPortal from "./locales/so/driverPortal.json";
import soFinance from "./locales/so/finance.json";
import soHr from "./locales/so/hr.json";
import soSecurity from "./locales/so/security.json";
import soReports from "./locales/so/reports.json";

import arCommon from "./locales/ar/common.json";
import arAuth from "./locales/ar/auth.json";
import arAccount from "./locales/ar/account.json";
import arAnalytics from "./locales/ar/analytics.json";
import arInventory from "./locales/ar/inventory.json";
import arSales from "./locales/ar/sales.json";
import arCustomerPortal from "./locales/ar/customerPortal.json";
import arSuppliers from "./locales/ar/suppliers.json";
import arCustomers from "./locales/ar/customers.json";
import arSupplierPortal from "./locales/ar/supplierPortal.json";
import arDelivery from "./locales/ar/delivery.json";
import arDriverPortal from "./locales/ar/driverPortal.json";
import arFinance from "./locales/ar/finance.json";
import arHr from "./locales/ar/hr.json";
import arSecurity from "./locales/ar/security.json";
import arReports from "./locales/ar/reports.json";

export const supportedLanguages = ["en", "so", "ar"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const rtlLanguages: SupportedLanguage[] = ["ar"];

export const defaultNamespace = "common";

i18next.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: defaultNamespace,
  ns: [
    "common",
    "auth",
    "account",
    "analytics",
    "inventory",
    "sales",
    "customerPortal",
    "suppliers",
    "customers",
    "supplierPortal",
    "delivery",
    "driverPortal",
    "finance",
    "hr",
    "security",
    "reports",
  ],
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      account: enAccount,
      analytics: enAnalytics,
      inventory: enInventory,
      sales: enSales,
      customerPortal: enCustomerPortal,
      suppliers: enSuppliers,
      customers: enCustomers,
      supplierPortal: enSupplierPortal,
      delivery: enDelivery,
      driverPortal: enDriverPortal,
      finance: enFinance,
      hr: enHr,
      security: enSecurity,
      reports: enReports,
    },
    so: {
      common: soCommon,
      auth: soAuth,
      account: soAccount,
      analytics: soAnalytics,
      inventory: soInventory,
      sales: soSales,
      customerPortal: soCustomerPortal,
      suppliers: soSuppliers,
      customers: soCustomers,
      supplierPortal: soSupplierPortal,
      delivery: soDelivery,
      driverPortal: soDriverPortal,
      finance: soFinance,
      hr: soHr,
      security: soSecurity,
      reports: soReports,
    },
    ar: {
      common: arCommon,
      auth: arAuth,
      account: arAccount,
      analytics: arAnalytics,
      inventory: arInventory,
      sales: arSales,
      customerPortal: arCustomerPortal,
      suppliers: arSuppliers,
      customers: arCustomers,
      supplierPortal: arSupplierPortal,
      delivery: arDelivery,
      driverPortal: arDriverPortal,
      finance: arFinance,
      hr: arHr,
      security: arSecurity,
      reports: arReports,
    },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
