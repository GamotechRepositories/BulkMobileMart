import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getMe, loginUser, signupUser } from "../api/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "bmm_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(null);

  const persistAuth = (authUser, authToken) => {
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: authUser, token: authToken })
    );
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const openAuthModal = useCallback((mode = "login") => {
    setAuthModal(mode);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const { token: savedToken } = JSON.parse(stored);
        if (!savedToken) {
          clearAuth();
          setLoading(false);
          return;
        }

        setToken(savedToken);
        const res = await getMe();
        persistAuth(res.data.data, savedToken);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signup = async (data) => {
    const res = await signupUser(data);
    persistAuth(res.data.data.user, res.data.data.token);
    closeAuthModal();
    return res.data;
  };

  const login = async (data) => {
    const res = await loginUser(data);
    persistAuth(res.data.data.user, res.data.data.token);
    closeAuthModal();
    return res.data;
  };

  const adminLogin = async (data) => {
    const res = await loginUser(data);
    const { user: authUser, token: authToken } = res.data.data;

    if (authUser.role !== "admin") {
      throw new Error("Access denied. Admin credentials required.");
    }

    persistAuth(authUser, authToken);
    return res.data;
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        login,
        adminLogin,
        logout,
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
