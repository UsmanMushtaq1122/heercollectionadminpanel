import { api } from "./api";
import type {
  DashboardAnalytics,
  Product,
  Order,
  OrderEmailPreviewResponse,
  OrderEmailResendResult,
  Customer,
  Coupon,
  Transaction,
  Category,
  Testimonial,
  CMSPage,
  Collection,
  FAQ,
  Career,
  StoreLocation,
  Banner,
  Subscriber,
  ContactMessage,
  SiteSettings,
  User,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("accessToken") ?? undefined;
}

export interface SocialMediaLink {
  id: string;
  platform: string;
  platformKey: string;
  url: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const response = await api.get<Record<string, T>>(`/settings/${key}`, getToken());
  return response[key] ?? fallback;
}

async function writeSetting<T>(key: string, value: T): Promise<ApiResponse<{ success: boolean }>> {
  await api.put<Record<string, T>>(`/settings/${key}`, { value }, getToken());
  return { success: true } as ApiResponse<{ success: boolean }>;
}

function toApiRole(role: string): string {
  return role.toUpperCase();
}

type OrderListResponse = Partial<PaginatedResponse<Order>> & {
  orders?: Order[];
};

type CustomerListResponse = Partial<PaginatedResponse<Customer>> & {
  customers?: Customer[];
};

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardService = {
  getAnalytics: () =>
    api.get<DashboardAnalytics>("/dashboard/analytics", getToken()),
};

// ─── Products ───────────────────────────────────────────────────────────────
export const adminProductService = {
  list: (params?: Record<string, string>) => {
    const qs = "?" + new URLSearchParams({ showAll: "true", ...params }).toString();
    return api.get<PaginatedResponse<Product>>(`/products${qs}`, getToken());
  },
  get: (id: string) =>
    api.get<Product>(`/products/${id}`, getToken()),
  create: (data: Partial<Product>) =>
    api.post<ApiResponse<{ id: string }>>("/products", data, getToken()),
  update: (id: string, data: Partial<Product>) =>
    api.put<ApiResponse<{ id: string }>>(`/products/${id}`, data, getToken()),
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    return api.upload<Array<{ url: string; publicId: string }>>(
      "/products/bulk-upload",
      formData,
      getToken()
    );
  },
  remove: (id: string) =>
    api.delete<{ message: string; archived: boolean; status: string | null }>(
      `/products/${id}`,
      getToken()
    ),
  duplicate: async (id: string) => {
    const product = await api.get<Product>(`/products/${id}`, getToken());
    const copy = {
      name: `${product.name} (Copy)`,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      costPrice: product.costPrice,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      categoryId: product.categoryId || product.categories?.[0]?.id || "",
      sku: product.sku ? `${product.sku}-COPY` : undefined,
      barcode: product.barcode,
      weight: product.weight,
      status: product.status,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      isBestSeller: product.isBestSeller,
      images: product.images,
      tags: product.tags,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    };
    return api.post<ApiResponse<Product>>(
      "/products",
      copy,
      getToken()
    );
  },
};

// ─── Orders ─────────────────────────────────────────────────────────────────
export const adminOrderService = {
  list: async (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await api.get<OrderListResponse>(`/orders${qs}`, getToken());
    if (res && !res.data && Array.isArray(res.orders)) {
      return { ...res, data: res.orders } as PaginatedResponse<Order>;
    }
    return res as PaginatedResponse<Order>;
  },
  get: (id: string) =>
    api.get<Order>(`/orders/${id}`, getToken()),
  updateStatus: (id: string, status: string, note?: string, cancellationReason?: string) =>
    api.put<ApiResponse<{ success: boolean }>>(
      `/orders/${id}/status`,
      {
        status,
        ...(note ? { note } : {}),
        ...(cancellationReason ? { cancellationReason } : {}),
      },
      getToken()
    ),
  updateNotes: (id: string, internalNotes: string) =>
    api.put<ApiResponse<{ success: boolean }>>(`/orders/${id}/notes`, { notes: internalNotes }, getToken()),
  updateTracking: (
    id: string,
    trackingNumber: string,
    trackingUrl?: string,
    courierName?: string,
    estimatedDelivery?: string
  ) =>
    api.put<ApiResponse<{ success: boolean }>>(
      `/orders/${id}/tracking`,
      {
        trackingNumber,
        url: trackingUrl || "",
        ...(courierName ? { courierName } : {}),
        ...(estimatedDelivery ? { estimatedDelivery } : {}),
      },
      getToken()
    ),
  bulkUpdateStatus: (orderIds: string[], status: string) =>
    Promise.all(orderIds.map((id) => api.put<ApiResponse<{ success: boolean }>>(`/orders/${id}/status`, { status }, getToken())))
      .then(() => ({ success: true } as ApiResponse<{ success: boolean }>)),
  previewEmail: (id: string, status?: string) =>
    api.get<OrderEmailPreviewResponse>(
      `/orders/${id}/email-preview${status ? `?status=${encodeURIComponent(status.toUpperCase())}` : ""}`,
      getToken()
    ),
  resendEmail: (id: string, status: string) =>
    api.post<OrderEmailResendResult>(
      `/orders/${id}/email-resend`,
      { status: status.toUpperCase() },
      getToken()
    ),
};

// ─── Customers ──────────────────────────────────────────────────────────────
export const adminCustomerService = {
  list: async (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await api.get<CustomerListResponse>(`/customers${qs}`, getToken());
    if (Array.isArray(res)) return res as Customer[];
    if (res && Array.isArray(res.data)) return res.data as Customer[];
    if (res && Array.isArray(res.customers)) return res.customers as Customer[];
    return [] as Customer[];
  },
  update: (id: string, data: Partial<Customer>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/customers/${id}`, data, getToken()),
};

// ─── Coupons ────────────────────────────────────────────────────────────────
export const adminCouponService = {
  list: () =>
    api.get<Coupon[]>("/coupons", getToken()),
  create: (data: Partial<Coupon>) =>
    api.post<ApiResponse<Coupon>>("/coupons", data, getToken()),
  update: (id: string, data: Partial<Coupon>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/coupons/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/coupons/${id}`, getToken()),
};

// ─── Payments ───────────────────────────────────────────────────────────────
export const adminPaymentService = {
  list: async () => {
    const response = await api.get<
      | Transaction[]
      | { payments: Array<Record<string, unknown>> }
    >("/payments", getToken());
    const payments: Array<Record<string, unknown>> = (Array.isArray(response)
      ? response
      : response.payments) as Array<Record<string, unknown>>;

    return payments.map((payment) => ({
      id: String(payment.id ?? payment.transactionId ?? ""),
      orderId: String(payment.orderId ?? ""),
      orderNumber: String(
        payment.orderNumber ??
          (payment.order as { orderNumber?: string } | undefined)?.orderNumber ??
          "Unknown order"
      ),
      amount: Number(payment.amount ?? 0),
      method: String(payment.method ?? payment.paymentMethod ?? "unknown").toLowerCase(),
      status: String(payment.status ?? "pending").toLowerCase().replace("partially_refunded", "refunded") as Transaction["status"],
      reference: payment.reference ? String(payment.reference) : undefined,
      createdAt: String(payment.createdAt ?? new Date().toISOString()),
    }));
  },
  refund: (id: string) =>
    api.post<ApiResponse<{ success: boolean }>>(`/payments/${id}/refund`, undefined, getToken()),
};

// ─── Categories ─────────────────────────────────────────────────────────────
export const adminCategoryService = {
  list: async () => {
    const response = await api.get<Category[] | { categories: Category[] }>("/categories", getToken());
    return Array.isArray(response) ? response : response.categories;
  },
  create: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>("/categories", data, getToken()),
  /** Upload with file — sends multipart/form-data */
  createWithImage: (formData: FormData) =>
    api.upload<ApiResponse<Category>>("/categories", formData, getToken()),
  update: (id: string, data: Partial<Category>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/categories/${id}`, data, getToken()),
  /** Update with file — sends multipart/form-data PUT */
  updateWithImage: (id: string, formData: FormData) =>
    api.uploadPut<ApiResponse<{ success: boolean }>>(`/categories/${id}`, formData, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/categories/${id}`, getToken()),
  toggle: async (id: string) => {
    const category = await api.get<Category>(`/categories/${id}`, getToken());
    return api.put<ApiResponse<{ success: boolean }>>(
      `/categories/${id}`,
      { isActive: !category.isActive },
      getToken()
    );
  },
};

// ─── Content: Testimonials ──────────────────────────────────────────────────
export const adminTestimonialService = {
  list: () =>
    api.get<Testimonial[]>("/testimonials?all=true", getToken()),
  create: (data: Partial<Testimonial>) =>
    api.post<ApiResponse<Testimonial>>("/testimonials", data, getToken()),
  createUpload: (data: FormData) =>
    api.upload<ApiResponse<Testimonial>>("/testimonials", data, getToken()),
  update: (id: string, data: Partial<Testimonial>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/testimonials/${id}`, data, getToken()),
  updateUpload: (id: string, data: FormData) =>
    api.uploadPut<ApiResponse<{ success: boolean }>>(`/testimonials/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/testimonials/${id}`, getToken()),
};

// ─── Content: Pages ─────────────────────────────────────────────────────────
export const adminPageService = {
  list: () =>
    api.get<CMSPage[]>("/pages", getToken()),
  create: (data: Partial<CMSPage>) =>
    api.post<ApiResponse<CMSPage>>("/pages", data, getToken()),
  update: (id: string, data: Partial<CMSPage>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/pages/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/pages/${id}`, getToken()),
};

// ─── Content: Editorial ─────────────────────────────────────────────────────
export const adminEditorialService = {
  list: () =>
    api.get<Collection[]>("/editorial", getToken()),
  create: (data: Partial<Collection>) =>
    api.post<ApiResponse<Collection>>("/editorial", data, getToken()),
  update: (id: string, data: Partial<Collection>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/editorial/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/editorial/${id}`, getToken()),
};

// ─── Content: Banners ───────────────────────────────────────────────────────
export const adminBannerService = {
  list: () =>
    api.get<Banner[]>("/banners?all=true", getToken()),
  create: (data: Partial<Banner>) =>
    api.post<ApiResponse<Banner>>("/banners", data, getToken()),
  createUpload: (data: FormData) =>
    api.upload<Banner>("/banners", data, getToken()),
  update: (id: string, data: Partial<Banner>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/banners/${id}`, data, getToken()),
  updateUpload: (id: string, data: FormData) =>
    api.uploadPut<{ success: boolean }>(`/banners/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/banners/${id}`, getToken()),
};

// ─── Content: FAQs ──────────────────────────────────────────────────────────
export const adminFaqService = {
  list: () =>
    api.get<FAQ[]>("/faqs", getToken()),
  create: (data: Partial<FAQ>) =>
    api.post<ApiResponse<FAQ>>("/faqs", data, getToken()),
  update: (id: string, data: Partial<FAQ>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/faqs/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/faqs/${id}`, getToken()),
};

// ─── Content: Careers ───────────────────────────────────────────────────────
export const adminCareerService = {
  list: () =>
    api.get<Career[]>("/careers", getToken()),
  create: (data: Partial<Career>) =>
    api.post<ApiResponse<Career>>("/careers", data, getToken()),
  update: (id: string, data: Partial<Career>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/careers/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/careers/${id}`, getToken()),
};

// ─── Content: Locations ─────────────────────────────────────────────────────
export const adminLocationService = {
  list: () =>
    api.get<StoreLocation[]>("/locations", getToken()),
  create: (data: Partial<StoreLocation>) =>
    api.post<ApiResponse<StoreLocation>>("/locations", data, getToken()),
  update: (id: string, data: Partial<StoreLocation>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/locations/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/locations/${id}`, getToken()),
};

// ─── Content: Collections ───────────────────────────────────────────────────
export const adminCollectionService = {
  list: () =>
    api.get<Collection[]>("/editorial", getToken()),
  create: (data: Partial<Collection>) =>
    api.post<ApiResponse<Collection>>("/editorial", data, getToken()),
  update: (id: string, data: Partial<Collection>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/editorial/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/editorial/${id}`, getToken()),
};

// ─── Settings ───────────────────────────────────────────────────────────────
export const adminSettingsService = {
  getGeneral: () =>
    api.get<SiteSettings>("/settings", getToken()),
  updateGeneral: (data: Partial<SiteSettings>) =>
    Promise.all(Object.entries(data).map(([key, value]) => writeSetting(key, value)))
      .then(() => ({ success: true } as ApiResponse<{ success: boolean }>)),
  getShipping: () =>
    readSetting<{
      shippingCost: number;
      expressShippingCost: number;
      freeShippingThreshold: number;
      codFee: number;
      codEnabled: boolean;
      advancedShippingEnabled: boolean;
      additionalShippingChargeEnabled: boolean;
      additionalShippingCharge: number;
      expressAdditionalChargeEnabled: boolean;
      expressAdditionalCharge: number;
      perItemChargeEnabled: boolean;
      perItemCharge: number;
      perKgChargeEnabled: boolean;
      perKgCharge: number;
    }>("shipping", {
      shippingCost: 199,
      expressShippingCost: 399,
      freeShippingThreshold: 5000,
      codFee: 0,
      codEnabled: true,
      advancedShippingEnabled: false,
      additionalShippingChargeEnabled: false,
      additionalShippingCharge: 0,
      expressAdditionalChargeEnabled: false,
      expressAdditionalCharge: 0,
      perItemChargeEnabled: false,
      perItemCharge: 0,
      perKgChargeEnabled: false,
      perKgCharge: 0,
    }),
  updateShipping: (data: Record<string, unknown>) =>
    writeSetting("shipping", data),
  getSEO: () =>
    readSetting<{ metaTitle: string; metaDescription: string }>("seo", { metaTitle: "", metaDescription: "" }),
  updateSEO: (data: { metaTitle: string; metaDescription: string }) =>
    writeSetting("seo", data),
  getUsers: () =>
    api.get<User[]>("/users", getToken()),
  inviteUser: (data: { email: string; role: string }) =>
    api.post<ApiResponse<User>>("/users", {
      name: data.email.split("@")[0],
      email: data.email,
      role: toApiRole(data.role),
    }, getToken()),
  updateUserRole: (id: string, role: string) =>
    api.put<ApiResponse<{ success: boolean }>>(`/users/${id}`, { role: toApiRole(role) }, getToken()),
  updateUserStatus: (id: string, isActive: boolean) =>
    api.put<ApiResponse<{ success: boolean }>>(`/users/${id}`, { isActive }, getToken()),
  removeUser: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/users/${id}`, getToken()),
};

export const adminSocialMediaService = {
  list: () => api.get<SocialMediaLink[]>("/social-media/admin", getToken()),
  create: (data: Omit<SocialMediaLink, "id" | "platformKey" | "createdAt" | "updatedAt">) =>
    api.post<SocialMediaLink>("/social-media", data, getToken()),
  update: (id: string, data: Partial<Pick<SocialMediaLink, "platform" | "url" | "icon" | "displayOrder" | "isActive">>) =>
    api.put<SocialMediaLink>(`/social-media/${id}`, data, getToken()),
  setStatus: (id: string, isActive: boolean) =>
    api.patch<SocialMediaLink>(`/social-media/${id}/status`, { isActive }, getToken()),
  reorder: (items: Array<{ id: string; displayOrder: number }>) =>
    api.patch<SocialMediaLink[]>("/social-media/reorder", { items }, getToken()),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/social-media/${id}`, getToken()),
};

// ─── Marketing: Newsletter ──────────────────────────────────────────────────
export const adminNewsletterService = {
  list: () =>
    api.get<Subscriber[]>("/newsletter", getToken()),
  getStats: () =>
    api.get<Subscriber[]>("/newsletter", getToken()).then((subscribers) => {
      const counts = new Map<string, number>();
      subscribers.forEach((subscriber) => {
        const date = new Date(subscriber.createdAt).toISOString().slice(0, 10);
        counts.set(date, (counts.get(date) || 0) + 1);
      });
      return Array.from(counts, ([date, count]) => ({ date, count }));
    }),
  toggleSubscriber: (id: string, isActive: boolean) =>
    api.put<ApiResponse<{ success: boolean }>>(`/newsletter/${id}`, { isActive }, getToken()),
  removeSubscriber: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/newsletter/${id}`, getToken()),
};

// ─── Marketing: Messages ────────────────────────────────────────────────────
export const adminMessageService = {
  list: () =>
    api.get<ContactMessage[]>("/contact", getToken()),
  update: (id: string, data: Partial<ContactMessage>) =>
    api.put<ApiResponse<{ success: boolean }>>(`/contact/${id}`, data, getToken()),
  remove: (id: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/contact/${id}`, getToken()),
};
