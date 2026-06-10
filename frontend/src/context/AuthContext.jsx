import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { loginUser, signupUser } from "../api/api";
import { ADMIN_STORAGE_KEY, STORAGE_KEY } from "../utils/authStorage";

const AuthContext = createContext(null);

async function fetchMeWithToken(token) {
  const res = await api.get("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(null);

  const persistCustomerAuth = (authUser, authToken) => {
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: authUser, token: authToken })
    );
  };

  const persistAdminAuth = (authUser, authToken) => {
    setAdminUser(authUser);
    setAdminToken(authToken);
    localStorage.setItem(
      ADMIN_STORAGE_KEY,
      JSON.stringify({ user: authUser, token: authToken })
    );
  };

  const clearCustomerAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearAdminAuth = () => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  };

  const openAuthModal = useCallback((mode = "login") => {
    setAuthModal(mode);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedCustomer = localStorage.getItem(STORAGE_KEY);
      const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);

      // Migrate legacy sessions where admin was saved in customer storage
      if (storedCustomer) {
        try {
          const parsed = JSON.parse(storedCustomer);
          if (parsed.user?.role === "admin" && parsed.token) {
            if (!storedAdmin) {
              localStorage.setItem(ADMIN_STORAGE_KEY, storedCustomer);
            }
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      const customerRaw = localStorage.getItem(STORAGE_KEY);
      const adminRaw = localStorage.getItem(ADMIN_STORAGE_KEY);

      const tasks = [];

      if (customerRaw) {
        tasks.push(
          (async () => {
            try {
              const { token: savedToken } = JSON.parse(customerRaw);
              if (!savedToken) {
                clearCustomerAuth();
                return;
              }
              setToken(savedToken);
              const authUser = await fetchMeWithToken(savedToken);
              if (authUser.role === "admin") {
                clearCustomerAuth();
                return;
              }
              persistCustomerAuth(authUser, savedToken);
            } catch {
              clearCustomerAuth();
            }
          })()
        );
      }

      if (adminRaw) {
        tasks.push(
          (async () => {
            try {
              const { token: savedToken } = JSON.parse(adminRaw);
              if (!savedToken) {
                clearAdminAuth();
                return;
              }
              setAdminToken(savedToken);
              const authUser = await fetchMeWithToken(savedToken);
              if (authUser.role !== "admin") {
                clearAdminAuth();
                return;
              }
              persistAdminAuth(authUser, savedToken);
            } catch {
              clearAdminAuth();
            }
          })()
        );
      }

      await Promise.all(tasks);
      setLoading(false);
    };

    initAuth();
  }, []);

  const signup = async (data) => {
    const res = await signupUser(data);
    const { user: authUser, token: authToken } = res.data.data;

    if (authUser.role === "admin") {
      throw new Error("Please use the admin login page.");
    }

    persistCustomerAuth(authUser, authToken);
    closeAuthModal();
    return res.data;
  };

  const login = async (data) => {
    const res = await loginUser(data);
    const { user: authUser, token: authToken } = res.data.data;

    if (authUser.role === "admin") {
      throw new Error("Please use the admin login page at /admin/login.");
    }

    persistCustomerAuth(authUser, authToken);
    closeAuthModal();
    return res.data;
  };

  const adminLogin = async (data) => {
    const res = await loginUser(data);
    const { user: authUser, token: authToken } = res.data.data;

    if (authUser.role !== "admin") {
      throw new Error("Access denied. Admin credentials required.");
    }

    persistAdminAuth(authUser, authToken);
    return res.data;
  };

  const logout = () => {
    clearCustomerAuth();
  };

  const adminLogout = () => {
    clearAdminAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        adminUser,
        adminToken,
        loading,
        signup,
        login,
        adminLogin,
        logout,
        adminLogout,
        authModal,
        openAuthModal,
        closeAuthModal,
        setAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
