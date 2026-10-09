import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Helper: optional number that gracefully handles NaN from valueAsNumber inputs
const nanSafeOptionalNum = z
  .union([z.number(), z.nan(), z.null(), z.undefined()])
  .transform((v) =>
    v === null || v === undefined || (typeof v === "number" && isNaN(v)) ? undefined : v
  )
  .pipe(z.number().optional());

const nanSafeOptionalPositiveNum = nanSafeOptionalNum.refine(
  (value) => value === undefined || value > 0,
  "Price must be greater than 0"
);

// Helper: required number that defaults to 0 on NaN/empty
const nanSafeNum = (min = 0, msg?: string) =>
  z
    .union([z.number(), z.nan(), z.null(), z.undefined()])
    .transform((v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v)) ? 0 : Number(v)
    )
    .pipe(z.number().min(min, msg));

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .min(2, "Product name must be at least 2 characters"),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  price: nanSafeNum(0.01, "Price must be greater than 0"),
  compareAtPrice: nanSafeOptionalPositiveNum,
  costPrice: nanSafeOptionalPositiveNum,
  currency: z.string().default("PKR"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional().nullable(),
  stock: nanSafeNum(0, "Stock must be non-negative"),
  lowStockThreshold: z
    .union([z.number(), z.nan(), z.null(), z.undefined()])
    .transform((v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v)) ? 5 : Number(v)
    )
    .pipe(z.number().default(5)),
  weight: nanSafeOptionalNum,
  status: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() : val),
    z.enum(["active", "draft", "archived"])
  ),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  inStock: z.boolean().default(true),
  collection: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  sizes: z
    .array(
      z.union([
        z.object({
          id: z.string().optional(),
          name: z.string(),
          label: z.string().optional(),
          inStock: z.boolean().default(true),
        }),
        z.string().transform((name) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          label: name,
          inStock: true,
        })),
      ])
    )
    .default([]),
  colors: z
    .array(
      z.union([
        z.object({
          id: z.string().optional(),
          name: z.string(),
          hex: z.string().default("#C9A27E"),
          swatch: z.string().optional().nullable(),
        }),
        z.string().transform((name) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          hex: "#C9A27E",
        })),
      ])
    )
    .default([]),
  materials: z.array(z.string()).default([]),
  careInstructions: z.array(z.string()).default([]),
  fabric: z.string().optional().nullable(),
  descriptionSections: z
    .object({
      color: z.string().optional().nullable(),
      note: z.string().optional().nullable(),
      sections: z
        .array(
          z.object({
            title: z.string(),
            items: z.array(z.string()),
          })
        )
        .default([]),
    })
    .optional()
    .nullable(),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  image: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const bannerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  image: z.string().min(1, "Image is required"),
  mobileImage: z.string().optional(),
  link: z.string().optional(),
  buttonText: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  type: z.enum(["hero", "editorial", "announcement"]),
});

export const testimonialSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerImage: z.string().optional(),
  location: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  rating: z.number().min(1).max(5),
  type: z.enum(["gallery", "video", "instagram", "story"]),
  image: z.string().optional(),
  videoUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  category: z.string().min(1, "Category is required"),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").toUpperCase(),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(0.01, "Value must be positive"),
  minOrderAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  usageLimit: z.number().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const storeLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  hours: z.string().min(1, "Hours are required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().default(true),
});

export const careerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["full_time", "part_time", "contract", "internship"]),
  description: z.string().min(1, "Description is required"),
  requirements: z.array(z.string()).min(1, "At least one requirement is needed"),
  salary: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const cmsPageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const settingsSchema = z.object({
  brandName: z.string().min(1),
  brandDescription: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  address: z.string().min(1),
  shippingCost: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  codFee: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  instagramHandle: z.string().optional(),
  marqueeText: z.string().optional(),
  returnWindowDays: z.number().min(0),
  exchangeWindowDays: z.number().min(0),
  seoDefaults: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).optional(),
});

export const shippingSchema = z.object({
  shippingCost: z.number().finite().min(0),
  expressShippingCost: z.number().finite().min(0),
  freeShippingThreshold: z.number().finite().min(0),
  codFee: z.number().finite().min(0),
  codEnabled: z.boolean(),
  advancedShippingEnabled: z.boolean(),
  additionalShippingChargeEnabled: z.boolean().default(false),
  additionalShippingCharge: z.number().finite().min(0).default(0),
  expressAdditionalChargeEnabled: z.boolean().default(false),
  expressAdditionalCharge: z.number().finite().min(0).default(0),
  perItemChargeEnabled: z.boolean().default(false),
  perItemCharge: z.number().finite().min(0).default(0),
  perKgChargeEnabled: z.boolean().default(false),
  perKgCharge: z.number().finite().min(0).default(0),
});

export const seoSettingsSchema = z.object({
  metaTitle: z.string().min(1).max(60).optional(),
  metaDescription: z.string().min(1).max(160).optional(),
  baseUrl: z.string().url().optional(),
  canonicalUrl: z.boolean(),
});

export const adminUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "staff", "content_manager"]),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});
