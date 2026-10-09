"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { setCredentials, setLoading } from "@/store/slices/authSlice";
import { api } from "@/lib/api";
import type { User } from "@/types";

// ─── Cookie helpers ────────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // Use Lax (not Strict) so the cookie is sent on top-level navigations like
  // router.replace() which is what the proxy needs to see.
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, accessToken } = useAppSelector(
    (state) => state.auth
  );
  const router = useRouter();

  useEffect(() => {
    // isLoading starts as `true` (set in authSlice initialState).
    // We only need to hydrate once on first mount.
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          const parsedUser: User = JSON.parse(storedUser);

          // ✅ CRITICAL FIX: Re-sync the cookie every time we restore from
          // localStorage. The proxy (proxy.ts) reads cookies, NOT localStorage.
          // Without this, router.replace('/admin') gets blocked by the proxy
          // and redirects back to login → infinite "Redirecting..." loop.
          setCookie("accessToken", storedToken, 7);

          dispatch(
            setCredentials({
              user: parsedUser,
              accessToken: storedToken,
              refreshToken: localStorage.getItem("refreshToken") || "",
            })
          );
          return; // setCredentials already sets isLoading = false
        }
      } catch {
        // Corrupted storage — clear everything and start fresh
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        deleteCookie("accessToken");
      }

      // No valid session found
      dispatch(setLoading(false));
    };

    initAuth();
  }, [dispatch]); // Run once on mount

  // ─── login ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      user: User;
      token: string;
      refreshToken: string;
    }>("/auth/login", { email, password });

    if (!response.token || !response.user) {
      throw new Error("Invalid email or password. Please check your credentials and try again.");
    }

    if (response.user.role?.toUpperCase() === "CUSTOMER") {
      throw new Error("Access denied. This portal is for admin users only.");
    }

    const { user: loggedUser, token, refreshToken } = response;

    // Persist to both storage AND cookie (cookie is what the proxy reads)
    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setCookie("accessToken", token, 7);

    dispatch(setCredentials({ user: loggedUser, accessToken: token, refreshToken }));
    return { user: loggedUser, accessToken: token, refreshToken };
  };

  // ─── logout ─────────────────────────────────────────────────────────────────

  const logout = (queryClient?: { clear: () => void }) => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    deleteCookie("accessToken");
    dispatch({ type: "auth/logout" });
    queryClient?.clear();
    router.push("/admin/login");
  };

  // ─── permissions ────────────────────────────────────────────────────────────

  const hasPermission = (_resource: string, _action: string): boolean => {
    if (!user) return false;
    return user.role?.toUpperCase() !== "CUSTOMER";
  };

  return { user, isAuthenticated, isLoading, accessToken, login, logout, hasPermission };
}
