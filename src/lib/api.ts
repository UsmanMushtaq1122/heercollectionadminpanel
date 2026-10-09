const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface RequestOptions extends RequestInit {
  token?: string;
}

// ─── User-friendly error mapping (centralized) ──────────────────────────────

const NETWORK_MESSAGE =
  "Unable to connect to the server. Please check your internet connection and try again.";
const SERVER_MESSAGE =
  "Something went wrong on our server. Please try again in a moment.";

const TECHNICAL_PATTERN =
  /^(sqlstate|relation "|table "|column "|prisma|mongoose|sequelize|mongo|\bat [\w./\\]+:\d+:\d+)|(\b(http|)\/api\/v\d|\bstack trace|internal server error|database connection|uncaptured exception|unhandled rejection)/i;

// Detect generic/generated messages that shouldn't be shown verbatim.
function isUserFacingMessage(message: unknown): message is string {
  if (typeof message !== "string") return false;
  if (!message.trim()) return false;
  if (!/^[A-Za-z]/.test(message)) return false;
  if (message.length > 300) return false;
  if (TECHNICAL_PATTERN.test(message)) return false;
  return true;
}

function friendlyForStatus(status: number): string {
  if (status === 400) return "Please check your input and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return "The requested item could not be found.";
  if (status === 409) return "This record already exists or conflicts with existing data.";
  if (status === 422) return "Please correct the highlighted fields and try again.";
  if (status === 429) return "You've made too many requests. Please wait a moment and try again.";
  if (status >= 500) return SERVER_MESSAGE;
  return "An unexpected error occurred. Please try again.";
}

interface ErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string | string[]> | string[];
}

async function toErrorBody(response: Response): Promise<ErrorBody> {
  try {
    const body = (await response.json()) as ErrorBody | null;
    return body ?? {};
  } catch {
    return {};
  }
}

function buildErrorMessage(status: number, body: ErrorBody): string {
  if (status >= 500) return SERVER_MESSAGE;
  const serverMessage = body?.message;
  if (isUserFacingMessage(serverMessage)) {
    return serverMessage;
  }
  return friendlyForStatus(status);
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) {
    return error.friendlyMessage || fallback || error.message || SERVER_MESSAGE;
  }
  return fallback || SERVER_MESSAGE;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    } catch {
      // Network failure / DNS / CORS / server down — fetch throws a TypeError.
      throw new ApiError(NETWORK_MESSAGE, 0);
    }

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = this.getAccessToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          try {
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...fetchOptions,
              headers,
            });
            if (!retryResponse.ok) {
              throw new ApiError(await this.parseError(retryResponse), retryResponse.status);
            }
            return this.parseSuccess<T>(retryResponse);
          } catch (err) {
            if (err instanceof ApiError) throw err;
            throw new ApiError(NETWORK_MESSAGE, 0);
          }
        }
      }
      if (typeof window !== "undefined") {
        this.clearAuth();
        window.location.href = "/admin/login";
      }
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    if (!response.ok) {
      throw new ApiError(await this.parseError(response), response.status);
    }

    return this.parseSuccess<T>(response);
  }

  private async parseError(response: Response): Promise<string> {
    const body = await toErrorBody(response);
    return buildErrorMessage(response.status, body);
  }

  private async parseSuccess<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => null);
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      Object.prototype.hasOwnProperty.call(payload, "data")
    ) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData,
    method: "POST" | "PUT",
    token?: string
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError(NETWORK_MESSAGE, 0);
    }

    if (response.status === 401 && typeof window !== "undefined") {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = this.getAccessToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
              method,
              headers,
              body: formData,
            });
          } catch {
            throw new ApiError(NETWORK_MESSAGE, 0);
          }
        }
      }
      if (typeof window !== "undefined" && response.status === 401) {
        this.clearAuth();
        window.location.href = "/admin/login";
      }
    }

    if (!response.ok) {
      throw new ApiError(await this.parseError(response), response.status);
    }

    return this.parseSuccess<T>(response);
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  private setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    document.cookie = `accessToken=${accessToken}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
  }

  private clearAuth() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    document.cookie = "accessToken=; path=/; max-age=0";
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data?.token && data.data.refreshToken) {
        this.setTokens(data.data.token, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", token });
  }

  async post<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      token,
    });
  }

  async put<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      token,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      token,
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", token });
  }

  async upload<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    return this.uploadRequest<T>(endpoint, formData, "POST", token);
  }

  async uploadPut<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    return this.uploadRequest<T>(endpoint, formData, "PUT", token);
  }

  setAuthTokens(accessToken: string, refreshToken: string) {
    this.setTokens(accessToken, refreshToken);
  }

  getStoredUser() {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  setStoredUser(user: unknown) {
    if (typeof window === "undefined") return;
    localStorage.setItem("user", JSON.stringify(user));
  }

  logout() {
    this.clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  }
}

export class ApiError extends Error {
  status: number;
  friendlyMessage: string;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.friendlyMessage = status > 0 ? message : NETWORK_MESSAGE;
    this.name = "ApiError";
  }
}

export const api = new ApiClient(API_BASE_URL);
