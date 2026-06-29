import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { UsersPage } from "@/features/auth/UsersPage";
import { DashboardPage } from "@/features/analytics/DashboardPage";
import { CategoriesPage } from "@/features/inventory/CategoriesPage";
import { ProductsPage } from "@/features/inventory/ProductsPage";
import { ProductDetailPage } from "@/features/inventory/ProductDetailPage";
import { POSPage } from "@/features/sales/POSPage";
import { SalesOrdersPage } from "@/features/sales/SalesOrdersPage";
import { SalesOrderDetailPage } from "@/features/sales/SalesOrderDetailPage";
import { DiscountsPage } from "@/features/sales/DiscountsPage";
import { TaxRatesPage } from "@/features/sales/TaxRatesPage";
import { CustomerDashboardPage } from "@/features/customer-portal/CustomerDashboardPage";
import { ShopPage } from "@/features/customer-portal/ShopPage";
import { OrdersPage } from "@/features/customer-portal/OrdersPage";
import { OrderDetailPage } from "@/features/customer-portal/OrderDetailPage";
import { WalletPage } from "@/features/customer-portal/WalletPage";
import { SupplierStockPage } from "@/features/suppliers/SupplierStockPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { SupplierDashboardPage } from "@/features/supplier-portal/SupplierDashboardPage";
import { SupplierCompaniesPage } from "@/features/supplier-portal/SupplierCompaniesPage";
import { SupplierProductsPage } from "@/features/supplier-portal/SupplierProductsPage";
import { StockRequestsPage } from "@/features/supplier-portal/StockRequestsPage";
import { SupplierCategoriesPage } from "@/features/supplier-portal/SupplierCategoriesPage";
import { DispatchBoardPage } from "@/features/delivery/DispatchBoardPage";
import { DeliveryDetailPage } from "@/features/delivery/DeliveryDetailPage";
import { DeliveryIssuesPage } from "@/features/delivery/DeliveryIssuesPage";
import { DriverActivePage } from "@/features/driver-portal/DriverActivePage";
import { DriverHistoryPage } from "@/features/driver-portal/DriverHistoryPage";
import { ExpensesPage } from "@/features/finance/ExpensesPage";
import { FinancialReportsPage } from "@/features/finance/FinancialReportsPage";
import { LoansPage } from "@/features/finance/LoansPage";
import { CustomerLoanDetailsPage } from "@/features/finance/CustomerLoanDetailsPage";
import { StaffSalariesPage } from "@/features/hr/StaffSalariesPage";
import { AttendancePage } from "@/features/hr/AttendancePage";
import { MyAttendancePage } from "@/features/hr/MyAttendancePage";
import { AuditLogsPage } from "@/features/security/AuditLogsPage";
import { ActivityLogsPage } from "@/features/security/ActivityLogsPage";
import { SystemResetPage } from "@/features/security/SystemResetPage";
import { SalesReportPage } from "@/features/reports/SalesReportPage";
import { InventoryReportPage } from "@/features/reports/InventoryReportPage";
import { AccountSettingsPage } from "@/features/account/AccountSettingsPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PortalLayout } from "@/layouts/PortalLayout";
import { SupplierPortalLayout } from "@/layouts/SupplierPortalLayout";
import { DriverLayout } from "@/layouts/DriverLayout";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute allowedRoles={["admin", "manager", "staff"]} />}>
              <Route path="/app" element={<DashboardLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="inventory/products" element={<ProductsPage />} />
                <Route path="inventory/products/:id" element={<ProductDetailPage />} />
                <Route path="inventory/categories" element={<CategoriesPage />} />
                <Route path="sales/pos" element={<POSPage />} />
                <Route path="sales/orders" element={<SalesOrdersPage />} />
                <Route path="sales/orders/:id" element={<SalesOrderDetailPage />} />
                <Route path="sales/discounts" element={<DiscountsPage />} />
                <Route path="sales/tax-rates" element={<TaxRatesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers/stock" element={<SupplierStockPage />} />
                <Route path="delivery" element={<DispatchBoardPage />} />
                <Route path="delivery/:id" element={<DeliveryDetailPage />} />
                <Route path="delivery-issues" element={<DeliveryIssuesPage />} />
                <Route path="finance/expenses" element={<ExpensesPage />} />
                <Route path="finance/reports" element={<FinancialReportsPage />} />
                <Route path="finance/loans" element={<LoansPage />} />
                <Route path="finance/loans/:customerId" element={<CustomerLoanDetailsPage />} />
                <Route path="hr/salaries" element={<StaffSalariesPage />} />
                <Route path="hr/attendance" element={<AttendancePage />} />
                <Route path="hr/my-attendance" element={<MyAttendancePage />} />
                <Route path="reports/sales" element={<SalesReportPage />} />
                <Route path="reports/inventory" element={<InventoryReportPage />} />
                <Route path="settings/users" element={<UsersPage />} />
                <Route path="settings/audit-logs" element={<AuditLogsPage />} />
                <Route path="settings/activity-logs" element={<ActivityLogsPage />} />
                <Route path="settings/danger-zone" element={<SystemResetPage />} />
                <Route path="account/settings" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
              <Route path="/portal" element={<PortalLayout />}>
                <Route path="dashboard" element={<CustomerDashboardPage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="account/settings" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["supplier"]} />}>
              <Route path="/supplier" element={<SupplierPortalLayout />}>
                <Route path="dashboard" element={<SupplierDashboardPage />} />
                <Route path="companies" element={<SupplierCompaniesPage />} />
                <Route path="products" element={<SupplierProductsPage />} />
                <Route path="categories" element={<SupplierCategoriesPage />} />
                <Route path="stock-requests" element={<StockRequestsPage />} />
                <Route path="account/settings" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
              <Route path="/driver" element={<DriverLayout />}>
                <Route path="active" element={<DriverActivePage />} />
                <Route path="history" element={<DriverHistoryPage />} />
                <Route path="account/settings" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
      </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
