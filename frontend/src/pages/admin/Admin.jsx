import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminRoute from "../../components/admin/AdminRoute";
import OverviewSection from "../../components/admin/sections/OverviewSection";
import BannerSection from "../../components/admin/sections/BannerSection";
import AddCategorySection from "../../components/admin/sections/AddCategorySection";
import ShowCategorySection from "../../components/admin/sections/ShowCategorySection";
import AddProductSection from "../../components/admin/sections/AddProductSection";
import ShowProductSection from "../../components/admin/sections/ShowProductSection";
import UserSection from "../../components/admin/sections/UserSection";
import OrderSection from "../../components/admin/sections/OrderSection";
import AdminOrderDetailSection from "../../components/admin/sections/AdminOrderDetailSection";
import PaymentSection from "../../components/admin/sections/PaymentSection";
import PaymentProofSection from "../../components/admin/sections/PaymentProofSection";
import SupportSection from "../../components/admin/sections/SupportSection";
import AdminLogin from "./AdminLogin";

function Admin() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<OverviewSection />} />
          <Route path="banners" element={<BannerSection />} />
          <Route path="categories/add" element={<AddCategorySection />} />
          <Route path="categories/show" element={<ShowCategorySection />} />
          <Route path="categories" element={<Navigate to="show" replace />} />
          <Route path="products/add" element={<AddProductSection />} />
          <Route path="products/show" element={<ShowProductSection />} />
          <Route path="products" element={<Navigate to="show" replace />} />
          <Route path="users" element={<UserSection />} />
          <Route path="orders/:id" element={<AdminOrderDetailSection />} />
          <Route path="orders" element={<OrderSection />} />
          <Route path="payments" element={<PaymentSection />} />
          <Route path="payment-proofs" element={<PaymentProofSection />} />
          <Route path="support" element={<SupportSection />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default Admin;
