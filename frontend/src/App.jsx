import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AuthModal from "./components/auth/AuthModal";
import Layout from "./components/layout/Layout";
import ScrollToTop from "./components/layout/ScrollToTop";
import MobileLayout from "./layouts/MobileLayout";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import OrderInvoice from "./pages/OrderInvoice";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Product from "./pages/Product";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Blog from "./pages/Blog";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import Admin from "./pages/admin";

function AuthModalHost() {
  const { authModal, closeAuthModal, setAuthModal } = useAuth();

  if (!authModal) return null;

  return (
    <AuthModal
      mode={authModal}
      onClose={closeAuthModal}
      onSwitchMode={setAuthModal}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route
            path="/"
            element={
              <MobileLayout>
                <Home />
              </MobileLayout>
            }
          />
          <Route
            path="/orders"
            element={
              <MobileLayout>
                <Orders />
              </MobileLayout>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <MobileLayout>
                <OrderDetail />
              </MobileLayout>
            }
          />
          <Route path="/orders/:id/invoice" element={<OrderInvoice />} />
          <Route
            path="/profile"
            element={
              <MobileLayout>
                <Profile />
              </MobileLayout>
            }
          />
          <Route
            path="/cart"
            element={
              <MobileLayout>
                <Cart />
              </MobileLayout>
            }
          />
          <Route
            path="/checkout"
            element={
              <MobileLayout>
                <Checkout />
              </MobileLayout>
            }
          />
          <Route
            path="/product/:id"
            element={
              <MobileLayout>
                <ProductDetail />
              </MobileLayout>
            }
          />
          <Route
            path="/product"
            element={
              <MobileLayout>
                <Product />
              </MobileLayout>
            }
          />
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/about" element={<About />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
        <AuthModalHost />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
