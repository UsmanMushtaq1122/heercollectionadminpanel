"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Tag,
  X,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Ruler,
  Sparkles,
  Scissors,
  Check,
  FileText,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { productSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { adminCategoryService, adminCollectionService } from "@/lib/admin-services";
import type { z } from "zod";
import type { Product, Size, Color } from "@/types";

type ProductFormData = z.infer<typeof productSchema>;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

function isSupportedImage(file: File) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

async function optimizeProductImage(file: File): Promise<File> {
  const maxBytes = 100 * 1024;
  const maxDimension = 1600;

  if (file.size <= maxBytes) {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const loadedImage = new Image();
    loadedImage.onload = () => resolve(loadedImage);
    loadedImage.onerror = () => reject(new Error("Unable to process image"));
    loadedImage.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create image canvas");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.75;
  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  while (blob && blob.size > maxBytes && quality > 0.25) {
    quality -= 0.1;
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error("Image could not be reduced below the upload limit");
  }

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

const PRESET_SIZES = [
  { name: "XS", label: "Extra Small" },
  { name: "S", label: "Small" },
  { name: "M", label: "Medium" },
  { name: "L", label: "Large" },
  { name: "XL", label: "Extra Large" },
  { name: "XXL", label: "Double Extra Large" },
];

function normalizeSizes(rawSizes?: unknown): Size[] {
  if (!Array.isArray(rawSizes)) return [];
  return rawSizes.map((s, idx) => {
    if (typeof s === "string") {
      return {
        id: s.toLowerCase().replace(/\s+/g, "-"),
        name: s,
        label: s,
        inStock: true,
      };
    }
    if (typeof s === "object" && s !== null) {
      const obj = s as Record<string, unknown>;
      return {
        id: String(obj.id || `size-${idx}`),
        name: String(obj.name || ""),
        label: String(obj.label || obj.name || ""),
        inStock: obj.inStock !== false,
      };
    }
    return {
      id: `size-${idx}`,
      name: String(s),
      label: String(s),
      inStock: true,
    };
  });
}

function normalizeColors(rawColors?: unknown): Color[] {
  if (!Array.isArray(rawColors)) return [];
  return rawColors.map((c, idx) => {
    if (typeof c === "string") {
      return {
        id: c.toLowerCase().replace(/\s+/g, "-"),
        name: c,
        hex: "#C9A27E",
      };
    }
    if (typeof c === "object" && c !== null) {
      const obj = c as Record<string, unknown>;
      return {
        id: String(obj.id || `color-${idx}`),
        name: String(obj.name || ""),
        hex: String(obj.hex || "#C9A27E"),
        swatch: obj.swatch ? String(obj.swatch) : undefined,
      };
    }
    return {
      id: `color-${idx}`,
      name: String(c),
      hex: "#C9A27E",
    };
  });
}

function normalizeDescriptionSections(raw: unknown) {
  let parsed = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    return {
      color: typeof obj.color === "string" ? obj.color : "",
      note: typeof obj.note === "string" ? obj.note : "",
      sections: Array.isArray(obj.sections)
        ? (obj.sections as unknown[]).map((sec) => {
            const s = sec as Record<string, unknown>;
            return {
              title: typeof s?.title === "string" ? s.title : "",
              items: Array.isArray(s?.items)
                ? (s.items as unknown[]).map(String)
                : [],
            };
          })
        : [],
    };
  }
  return { color: "", note: "", sections: [] };
}

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormData & { imageFiles?: File[] }) => void;
  onDiscard?: () => void;
  isLoading?: boolean;
}

function ProductForm({ initialData, onSubmit, onDiscard, isLoading }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const response = await adminCategoryService.list();
      return response.filter((category) => category.slug !== "uncategorized");
    },
  });
  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => adminCollectionService.list(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      description: initialData?.description || "",
      shortDescription: initialData?.shortDescription || "",
      price: initialData?.price ?? 0,
      compareAtPrice: initialData?.compareAtPrice || undefined,
      costPrice: initialData?.costPrice || undefined,
      currency: initialData?.currency || "PKR",
      sku: initialData?.sku || "",
      barcode: initialData?.barcode || "",
      stock: initialData?.stock ?? 0,
      lowStockThreshold: initialData?.lowStockThreshold ?? 5,
      weight: initialData?.weight || undefined,
      status: (initialData?.status?.toLowerCase() as "active" | "draft" | "archived") || "active",
      isFeatured: initialData?.isFeatured || false,
      isNewArrival: initialData?.isNewArrival || false,
      isBestSeller: initialData?.isBestSeller || false,
      inStock: initialData?.inStock ?? true,
      collection: initialData?.collection || "",
      thumbnail: initialData?.thumbnail || "",
      categoryIds:
        ((initialData as unknown as Record<string, unknown>)?.categoryIds as string[] | undefined)?.length
          ? ((initialData as unknown as Record<string, unknown>).categoryIds as string[])
          : initialData?.categories && initialData.categories.length > 0
          ? initialData.categories.map((c) => c.id || c.slug || "").filter(Boolean)
          : initialData?.categoryId
          ? [initialData.categoryId]
          : [],
      sizes: normalizeSizes(initialData?.sizes),
      colors: normalizeColors(initialData?.colors),
      materials: Array.isArray(initialData?.materials) ? initialData.materials : [],
      careInstructions: Array.isArray(initialData?.careInstructions) ? initialData.careInstructions : [],
      tags: Array.isArray(initialData?.tags) ? initialData.tags : [],
      fabric: initialData?.fabric || "",
      descriptionSections: normalizeDescriptionSections(initialData?.descriptionSections),
      seoTitle: initialData?.seoTitle || "",
      seoDescription: initialData?.seoDescription || "",
    },
  });

  const nameValue = watch("name");
  const tagsValue = watch("tags") || [];
  const categoryIdsValue = watch("categoryIds") || [];
  const statusValue = watch("status");
  const isFeaturedValue = watch("isFeatured");
  const isNewArrivalValue = watch("isNewArrival");
  const isBestSellerValue = watch("isBestSeller");
  const inStockValue = watch("inStock");
  const collectionValue = watch("collection") || "";
  const sizesValue = (watch("sizes") as Size[]) || [];
  const materialsValue = watch("materials") || [];
  const careInstructionsValue = watch("careInstructions") || [];
  const fabricValue = watch("fabric") || "";
  const descriptionSectionsValue = watch("descriptionSections") || { color: "", note: "", sections: [] };

  type DescSection = { title: string; items: string[] };

  const [tagInput, setTagInput] = useState("");
  const [materialInput, setMaterialInput] = useState("");
  const [careInput, setCareInput] = useState("");

  // Description sections state
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionItem, setNewSectionItem] = useState<Record<number, string>>({});
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(null);

  // Size custom state
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizeLabel, setNewSizeLabel] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const [images, setImages] = useState<{ url: string; alt: string }[]>(() => {
    if (!initialData?.images) return [];
    return (initialData.images as unknown[])
      .map((img, idx) => {
        if (typeof img === "string") {
          return { url: img, alt: initialData.name || `Image ${idx + 1}` };
        }
        if (img && typeof img === "object") {
          const item = img as { url?: string; alt?: string };
          return { url: item.url || "", alt: item.alt || "" };
        }
        return { url: "", alt: "" };
      })
      .filter((img) => Boolean(img.url));
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (nameValue && !initialData) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, initialData, setValue]);

  // Tags handlers
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tagsValue.includes(tag)) {
      setValue("tags", [...tagsValue, tag]);
      setTagInput("");
    }
  }, [tagInput, tagsValue, setValue]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      setValue(
        "tags",
        tagsValue.filter((t) => t !== tag)
      );
    },
    [tagsValue, setValue]
  );

  // Materials handlers
  const handleAddMaterial = useCallback(() => {
    const mat = materialInput.trim();
    if (mat && !materialsValue.includes(mat)) {
      setValue("materials", [...materialsValue, mat]);
      setMaterialInput("");
    }
  }, [materialInput, materialsValue, setValue]);

  const handleRemoveMaterial = useCallback(
    (mat: string) => {
      setValue(
        "materials",
        materialsValue.filter((m) => m !== mat)
      );
    },
    [materialsValue, setValue]
  );

  // Care instructions handlers
  const handleAddCare = useCallback(() => {
    const care = careInput.trim();
    if (care && !careInstructionsValue.includes(care)) {
      setValue("careInstructions", [...careInstructionsValue, care]);
      setCareInput("");
    }
  }, [careInput, careInstructionsValue, setValue]);

  const handleRemoveCare = useCallback(
    (care: string) => {
      setValue(
        "careInstructions",
        careInstructionsValue.filter((c) => c !== care)
      );
    },
    [careInstructionsValue, setValue]
  );

  // Sizes handlers
  const handleTogglePresetSize = useCallback(
    (preset: { name: string; label: string }) => {
      const exists = sizesValue.find((s) => s.name === preset.name);
      if (exists) {
        setValue(
          "sizes",
          sizesValue.filter((s) => s.name !== preset.name)
        );
      } else {
        const newSize: Size = {
          id: preset.name.toLowerCase(),
          name: preset.name,
          label: preset.label,
          inStock: true,
        };
        setValue("sizes", [...sizesValue, newSize]);
      }
    },
    [sizesValue, setValue]
  );

  const handleAddCustomSize = useCallback(() => {
    const name = newSizeName.trim().toUpperCase();
    if (!name) return;
    if (sizesValue.some((s) => s.name === name)) return;
    const newSize: Size = {
      id: name.toLowerCase(),
      name,
      label: newSizeLabel.trim() || name,
      inStock: true,
    };
    setValue("sizes", [...sizesValue, newSize]);
    setNewSizeName("");
    setNewSizeLabel("");
  }, [newSizeName, newSizeLabel, sizesValue, setValue]);

  const handleToggleSizeStock = useCallback(
    (sizeId: string) => {
      setValue(
        "sizes",
        sizesValue.map((s) =>
          s.id === sizeId ? { ...s, inStock: !s.inStock } : s
        )
      );
    },
    [sizesValue, setValue]
  );

  const handleRemoveSize = useCallback(
    (sizeId: string) => {
      setValue(
        "sizes",
        sizesValue.filter((s) => s.id !== sizeId)
      );
    },
    [sizesValue, setValue]
  );

  // Category toggle
  const toggleCategory = useCallback(
    (catId: string) => {
      const current = categoryIdsValue;
      if (current.includes(catId)) {
        setValue(
          "categoryIds",
          current.filter((id) => id !== catId)
        );
      } else {
        setValue("categoryIds", [...current, catId]);
      }
    },
    [categoryIdsValue, setValue]
  );

  // Image handlers
  const moveImage = useCallback(
    (index: number, direction: "up" | "down") => {
      const newImages = [...images];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return;
      [newImages[index], newImages[targetIndex]] = [
        newImages[targetIndex],
        newImages[index],
      ];
      setImages(newImages);
      if (newImages.length > 0) {
        setValue("thumbnail", newImages[0].url);
      }
    },
    [images, setValue]
  );

  const removeImage = useCallback(
    (index: number) => {
      const filtered = images.filter((_, i) => i !== index);
      setImages(filtered);
      if (filtered.length > 0) {
        setValue("thumbnail", filtered[0].url);
      } else {
        setValue("thumbnail", "");
      }
    },
    [images, setValue]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const validFiles = Array.from(files).filter((file) => {
        if (!isSupportedImage(file)) {
          alert(`${file.name} is not a supported image format (JPG, PNG, GIF, WEBP, AVIF).`);
          return false;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          alert(`${file.name} is larger than 10 MB and was not added.`);
          return false;
        }
        return true;
      });
      const uploaded: { url: string; alt: string }[] = [];
      const filesToUpload: File[] = [];
      try {
        const optimizedFiles = await Promise.all(
          validFiles.slice(0, 8 - images.length).map(optimizeProductImage)
        );
        optimizedFiles.forEach((file) => {
          const url = URL.createObjectURL(file);
          uploaded.push({ url, alt: file.name.replace(/\.[^/.]+$/, "") });
          filesToUpload.push(file);
        });
      } catch {
        toast("error", "One or more images could not be processed. Please try again.");
        return;
      }
      const combined = [...images, ...uploaded];
      setImages(combined);
      setImageFiles((current) => [...current, ...filesToUpload]);
      if (combined.length > 0 && !watch("thumbnail")) {
        setValue("thumbnail", combined[0].url);
      }
    },
    [images, toast, watch, setValue]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer.files;
      const uploaded: { url: string; alt: string }[] = [];
      const filesToUpload: File[] = [];
      const validFiles = Array.from(files)
        .filter((file) => {
          if (!isSupportedImage(file)) {
            alert(`${file.name} is not a supported image format (JPG, PNG, GIF, WEBP, AVIF).`);
            return false;
          }
          if (file.size > MAX_IMAGE_SIZE_BYTES) {
            alert(`${file.name} is larger than 10 MB and was not added.`);
            return false;
          }
          return true;
        })
        .slice(0, 8 - images.length);
      try {
        const optimizedFiles = await Promise.all(validFiles.map(optimizeProductImage));
        optimizedFiles.forEach((file) => {
          const url = URL.createObjectURL(file);
          uploaded.push({ url, alt: file.name.replace(/\.[^/.]+$/, "") });
          filesToUpload.push(file);
        });
      } catch {
        toast("error", "One or more images could not be processed. Please try again.");
        return;
      }
      const combined = [...images, ...uploaded];
      setImages(combined);
      setImageFiles((current) => [...current, ...filesToUpload]);
      if (combined.length > 0 && !watch("thumbnail")) {
        setValue("thumbnail", combined[0].url);
      }
    },
    [images, toast, watch, setValue]
  );

  const onFormSubmit = (data: ProductFormData) => {
    onSubmit({
      ...data,
      categoryId: data.categoryIds?.[0] || "",
      images,
      imageFiles,
    } as ProductFormData & { imageFiles?: File[] });
  };

  const onFormInvalid = (fieldErrors: typeof errors) => {
    console.warn("Product form validation errors:", fieldErrors);
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const err = (fieldErrors as Record<string, any>)[firstKey];
      const message = err?.message || `Please check the "${firstKey}" field.`;
      toast("error", `Please correct form error: ${message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* General info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Input
                  label="Product Name"
                  placeholder="e.g. Silk Embroidered Kurti — Royal Emerald"
                  {...register("name")}
                  error={errors.name?.message}
                />
                <Input
                  label="Slug"
                  placeholder="silk-embroidered-kurti-royal-emerald"
                  {...register("slug")}
                />
                <Textarea
                  label="Short Description"
                  placeholder="Brief summary for product cards and quick views..."
                  rows={2}
                  {...register("shortDescription")}
                  error={errors.shortDescription?.message}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Description Sections Builder */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.02 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#C9A27E]" />
                  <CardTitle>Description Builder</CardTitle>
                </div>
                <span className="text-xs text-[#1A1A1A]/50">
                  Structured product details for storefront
                </span>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-xs text-[#1A1A1A]/50 -mt-2">
                  Build a rich, structured description. Each section (e.g. Shirt, Trouser, Dupatta) can have multiple detail lines.
                </p>

                {/* Color / availability line */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Color / Availability Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Available in Ivory White, Midnight Black"
                    value={descriptionSectionsValue?.color || ""}
                    onChange={(e) =>
                      setValue("descriptionSections", {
                        ...descriptionSectionsValue,
                        color: e.target.value,
                        sections: descriptionSectionsValue?.sections || [],
                      })
                    }
                    className="w-full rounded-sm border border-[#1A1A1A]/15 bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                  />
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Sections
                  </label>

                  {(descriptionSectionsValue?.sections || []).map((section: DescSection, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/60 p-3 space-y-2"
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-[#1A1A1A]/30 shrink-0" />
                        <input
                          type="text"
                          placeholder="Section title (e.g. Shirt)"
                          value={section.title}
                          onChange={(e) => {
                            const updated = [...(descriptionSectionsValue?.sections || [])];
                            updated[sIdx] = { ...updated[sIdx], title: e.target.value };
                            setValue("descriptionSections", {
                              ...descriptionSectionsValue,
                              sections: updated,
                            });
                          }}
                          className="flex-1 rounded-sm border border-[#1A1A1A]/15 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (descriptionSectionsValue?.sections || []).filter((_: DescSection, i: number) => i !== sIdx);
                            setValue("descriptionSections", {
                              ...descriptionSectionsValue,
                              sections: updated,
                            });
                          }}
                          className="rounded p-1 text-[#1A1A1A]/40 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Items */}
                      <div className="ml-6 space-y-1.5">
                        {section.items.map((item: string, iIdx: number) => (
                          <div key={iIdx} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A27E] shrink-0" />
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const updated = [...(descriptionSectionsValue?.sections || [])];
                                const items = [...updated[sIdx].items];
                                items[iIdx] = e.target.value;
                                updated[sIdx] = { ...updated[sIdx], items };
                                setValue("descriptionSections", {
                                  ...descriptionSectionsValue,
                                  sections: updated,
                                });
                              }}
                              placeholder="Detail line (e.g. Fabric: Pure Raw Silk)"
                              className="flex-1 rounded-sm border border-[#1A1A1A]/10 bg-white px-2.5 py-1 text-xs text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(descriptionSectionsValue?.sections || [])];
                                const items = updated[sIdx].items.filter((_: string, i: number) => i !== iIdx);
                                updated[sIdx] = { ...updated[sIdx], items };
                                setValue("descriptionSections", {
                                  ...descriptionSectionsValue,
                                  sections: updated,
                                });
                              }}
                              className="text-[#1A1A1A]/30 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* Add item row */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]/20 shrink-0" />
                          <input
                            type="text"
                            placeholder="Add detail line..."
                            value={newSectionItem[sIdx] || ""}
                            onChange={(e) =>
                              setNewSectionItem((prev) => ({ ...prev, [sIdx]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (newSectionItem[sIdx] || "").trim();
                                if (!val) return;
                                const updated = [...(descriptionSectionsValue?.sections || [])];
                                updated[sIdx] = { ...updated[sIdx], items: [...updated[sIdx].items, val] };
                                setValue("descriptionSections", {
                                  ...descriptionSectionsValue,
                                  sections: updated,
                                });
                                setNewSectionItem((prev) => ({ ...prev, [sIdx]: "" }));
                              }
                            }}
                            className="flex-1 rounded-sm border border-dashed border-[#1A1A1A]/15 bg-transparent px-2.5 py-1 text-xs text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (newSectionItem[sIdx] || "").trim();
                              if (!val) return;
                              const updated = [...(descriptionSectionsValue?.sections || [])];
                              updated[sIdx] = { ...updated[sIdx], items: [...updated[sIdx].items, val] };
                              setValue("descriptionSections", {
                                ...descriptionSectionsValue,
                                sections: updated,
                              });
                              setNewSectionItem((prev) => ({ ...prev, [sIdx]: "" }));
                            }}
                            className="rounded p-1 text-[#C9A27E] hover:bg-[#C9A27E]/10 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add section button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New section title (e.g. Shirt, Trouser, Dupatta)"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const title = newSectionTitle.trim();
                          if (!title) return;
                          setValue("descriptionSections", {
                            ...descriptionSectionsValue,
                            sections: [
                              ...(descriptionSectionsValue?.sections || []),
                              { title, items: [] },
                            ],
                          });
                          setNewSectionTitle("");
                        }
                      }}
                      className="flex-1 rounded-sm border border-[#1A1A1A]/15 bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const title = newSectionTitle.trim();
                        if (!title) return;
                        setValue("descriptionSections", {
                          ...descriptionSectionsValue,
                          sections: [
                            ...(descriptionSectionsValue?.sections || []),
                            { title, items: [] },
                          ],
                        });
                        setNewSectionTitle("");
                      }}
                      disabled={!newSectionTitle.trim()}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
                    </Button>
                  </div>
                </div>

                {/* Note / Model info */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Note / Model Info
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. Model is wearing size M. Model height 5'6"`}
                    value={descriptionSectionsValue?.note || ""}
                    onChange={(e) =>
                      setValue("descriptionSections", {
                        ...descriptionSectionsValue,
                        note: e.target.value,
                        sections: descriptionSectionsValue?.sections || [],
                      })
                    }
                    className="w-full rounded-sm border border-[#1A1A1A]/15 bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:border-[#C9A27E] focus:outline-none transition-colors"
                  />
                </div>

                {/* Live preview */}
                {(descriptionSectionsValue?.sections?.length > 0 || descriptionSectionsValue?.color || descriptionSectionsValue?.note) && (
                  <div className="rounded-sm border border-[#C9A27E]/20 bg-[#FBF8F5] p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9A27E] mb-3">Preview (as shown on storefront)</p>
                    {descriptionSectionsValue?.color && (
                      <p className="text-xs text-[#1A1A1A]/70">{descriptionSectionsValue.color}</p>
                    )}
                    {(descriptionSectionsValue?.sections || []).map((section: DescSection, i: number) => (
                      <div key={i} className="text-xs">
                        <p className="font-bold text-[#1A1A1A]">{section.title}</p>
                        {section.items.map((item: string, j: number) => (
                          <p key={j} className="text-[#1A1A1A]/70">{item}</p>
                        ))}
                      </div>
                    ))}
                    {descriptionSectionsValue?.note && (
                      <p className="text-xs text-[#1A1A1A]/80 mt-1">{descriptionSectionsValue.note}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing & Inventory */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.025 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Pricing &amp; Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Input
                    label="Price (PKR)"
                    type="number"
                    placeholder="12500"
                    {...register("price", { valueAsNumber: true })}
                    error={errors.price?.message}
                  />
                  <Input
                    label="Compare At Price (PKR)"
                    type="number"
                    placeholder="15000"
                    {...register("compareAtPrice", { valueAsNumber: true })}
                  />
                  <Input
                    label="Cost Price (PKR)"
                    type="number"
                    placeholder="8000"
                    {...register("costPrice", { valueAsNumber: true })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="SKU"
                    placeholder="HC-LP-2026-001"
                    {...register("sku")}
                    error={errors.sku?.message}
                  />
                  <Input
                    label="Barcode"
                    placeholder="896400012345"
                    {...register("barcode")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Total Stock Quantity"
                    type="number"
                    placeholder="25"
                    {...register("stock", { valueAsNumber: true })}
                    error={errors.stock?.message}
                  />
                  <Input
                    label="Low Stock Threshold"
                    type="number"
                    placeholder="5"
                    {...register("lowStockThreshold", { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sizes & Fit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-[#C9A27E]" />
                  <CardTitle>Sizes & Availability</CardTitle>
                </div>
                <span className="text-xs text-[#1A1A1A]/50">
                  {sizesValue.length} size{sizesValue.length === 1 ? "" : "s"} configured
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Quick Add Presets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SIZES.map((preset) => {
                      const isSelected = sizesValue.some(
                        (s) => s.name === preset.name
                      );
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleTogglePresetSize(preset)}
                          className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? "border-[#C9A27E] bg-[#C9A27E]/15 text-[#1A1A1A] font-semibold"
                              : "border-[#1A1A1A]/15 bg-white text-[#1A1A1A]/70 hover:border-[#C9A27E]/60 hover:bg-[#F8F5F2]"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-[#C9A27E]" />}
                          <span>{preset.name}</span>
                          <span className="text-[10px] text-[#1A1A1A]/40">
                            ({preset.label})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom size input */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Size code (e.g. Free Size)"
                    value={newSizeName}
                    onChange={(e) => setNewSizeName(e.target.value)}
                    className="max-w-[140px]"
                  />
                  <Input
                    placeholder="Display label (e.g. One Size Fits All)"
                    value={newSizeLabel}
                    onChange={(e) => setNewSizeLabel(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomSize}
                    disabled={!newSizeName.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>

                {/* Active sizes list with inStock toggle */}
                {sizesValue.length > 0 && (
                  <div className="mt-3 divide-y divide-[#1A1A1A]/5 rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/50">
                    {sizesValue.map((size) => (
                      <div
                        key={size.id}
                        className="flex items-center justify-between p-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-white font-bold text-xs shadow-xs border border-[#1A1A1A]/10">
                            {size.name}
                          </span>
                          <span className="text-xs text-[#1A1A1A]/70">
                            {size.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#1A1A1A]/70">
                            <input
                              type="checkbox"
                              checked={size.inStock}
                              onChange={() => handleToggleSizeStock(size.id)}
                              className="h-3.5 w-3.5 rounded-xs accent-[#C9A27E]"
                            />
                            {size.inStock ? (
                              <span className="text-emerald-700 font-medium">In Stock</span>
                            ) : (
                              <span className="text-red-500 font-medium">Out of Stock</span>
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(size.id)}
                            className="text-[#1A1A1A]/40 hover:text-red-600 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Fabric & Care Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-[#C9A27E]" />
                  <CardTitle>Fabric & Care Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Materials */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Materials & Fabric Composition
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 100% Pure Raw Silk, Organza Dupatta..."
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMaterial();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddMaterial}
                      disabled={!materialInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {materialsValue.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {materialsValue.map((mat) => (
                        <span
                          key={mat}
                          className="inline-flex items-center gap-1 rounded-sm border border-[#1A1A1A]/10 bg-[#E8DDD4]/40 px-2.5 py-1 text-xs text-[#1A1A1A]"
                        >
                          {mat}
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(mat)}
                            className="text-[#1A1A1A]/40 hover:text-red-600 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Care instructions */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/60">
                    Care Instructions
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Dry clean only. Do not bleach. Steam iron inside out."
                      value={careInput}
                      onChange={(e) => setCareInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCare();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCare}
                      disabled={!careInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {careInstructionsValue.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {careInstructionsValue.map((care, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-sm border border-[#1A1A1A]/5 bg-white px-3 py-1.5 text-xs text-[#1A1A1A]"
                        >
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A27E]" />
                            {care}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCare(care)}
                            className="text-[#1A1A1A]/40 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Media */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Product Media & Gallery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`group relative overflow-hidden rounded-sm border ${
                          idx === 0
                            ? "border-[#C9A27E] ring-2 ring-[#C9A27E]/30"
                            : "border-[#1A1A1A]/10"
                        } bg-[#E8DDD4]`}
                      >
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 z-10 rounded bg-[#C9A27E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            Primary
                          </span>
                        )}
                        <div className="aspect-square flex items-center justify-center">
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "up")}
                            disabled={idx === 0}
                            className="rounded bg-white/90 p-1 text-[#1A1A1A] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "down")}
                            disabled={idx === images.length - 1}
                            className="rounded bg-white/90 p-1 text-[#1A1A1A] disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="rounded bg-white/90 p-1 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={img.alt}
                          onChange={(e) => {
                            const newImages = [...images];
                            newImages[idx] = {
                              ...newImages[idx],
                              alt: e.target.value,
                            };
                            setImages(newImages);
                          }}
                          placeholder="Alt text"
                          className="w-full border-t border-[#1A1A1A]/10 bg-white px-2 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 8 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-8 transition-colors ${
                      dragActive
                        ? "border-[#C9A27E] bg-[#C9A27E]/5"
                        : "border-[#1A1A1A]/15 hover:border-[#C9A27E]/50 hover:bg-[#C9A27E]/5"
                    }`}
                  >
                    <Upload className="mb-2 h-8 w-8 text-[#1A1A1A]/30" />
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      Drop images or click to upload
                    </p>
                    <p className="mt-1 text-xs text-[#1A1A1A]/40">
                      {8 - images.length} slots remaining (max 8). Images up to 10 MB each (optimized automatically).
                    </p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
                    >
                      Choose Files
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* SEO */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Search Engine Optimization (SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="SEO Title"
                  placeholder="Luxury Embroidered Silk Kurti | Heer Collection"
                  {...register("seoTitle")}
                />
                <Textarea
                  label="SEO Description"
                  placeholder="Discover exclusive Pakistani designer pret featuring intricate hand embroidery and premium pure silk."
                  rows={3}
                  {...register("seoDescription")}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status & Availability */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Status & In Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Product Status"
                  value={statusValue}
                  onChange={(e) =>
                    setValue(
                      "status",
                      e.target.value as "active" | "draft" | "archived"
                    )
                  }
                >
                  <option value="active">Active (Published)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="archived">Archived</option>
                </Select>

                <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">In Stock</p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      Enable storefront purchasing
                    </p>
                  </div>
                  <Switch
                    checked={inStockValue}
                    onCheckedChange={(checked) => setValue("inStock", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Editorial Collection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#C9A27E]" />
                  <CardTitle>Editorial Collection</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  label="Featured In Collection"
                  value={collectionValue}
                  onChange={(e) => setValue("collection", e.target.value)}
                >
                  <option value="">No collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-[11px] text-[#1A1A1A]/50">
                  Assigning to an editorial collection features this product on
                  homepage lookbooks and campaign banners.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Organization */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Storefront Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 transition-colors hover:bg-[#E8DDD4]/30"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-sm border-[#1A1A1A]/20 accent-[#C9A27E]"
                      checked={categoryIdsValue.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {cat.name}
                    </span>
                  </label>
                ))}
                {errors.categoryIds && (
                  <p className="text-xs text-red-500 pt-1">
                    {errors.categoryIds.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g. embroidered, three-piece)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tagsValue.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tagsValue.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-[#C9A27E]/20 bg-[#C9A27E]/10 px-2.5 py-1 text-xs font-medium text-[#B8906A]"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-[#C9A27E]/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Visibility Flags */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Highlight Badges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Featured</p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      Highlight in featured carousels
                    </p>
                  </div>
                  <Switch
                    checked={isFeaturedValue}
                    onCheckedChange={(checked) => setValue("isFeatured", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      New Arrival
                    </p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      Display "New" luxury badge
                    </p>
                  </div>
                  <Switch
                    checked={isNewArrivalValue}
                    onCheckedChange={(checked) =>
                      setValue("isNewArrival", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      Best Seller
                    </p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      Display "Best Seller" ribbon
                    </p>
                  </div>
                  <Switch
                    checked={isBestSellerValue}
                    onCheckedChange={(checked) =>
                      setValue("isBestSeller", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#1A1A1A]/10 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onDiscard) {
              onDiscard();
            } else {
              router.push("/admin/products");
            }
          }}
        >
          Discard
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialData ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}

export { ProductForm };
