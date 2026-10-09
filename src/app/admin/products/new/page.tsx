"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { ProductForm } from "@/components/products/product-form";
import { useToast } from "@/components/ui/toast";
import { adminProductService } from "@/lib/admin-services";
import type { Product } from "@/types";

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const imageFiles = data.imageFiles as File[] | undefined;
      const uploaded = imageFiles?.length
        ? await adminProductService.uploadImages(imageFiles)
        : [];
      const images = (data.images as Array<{ url: string; alt: string }> | undefined) ?? [];
      const uploadedImages = uploaded.map((image, index) => ({
        id: `img-${Date.now()}-${index}`,
        url: image.url,
        alt: images[index]?.alt || "Product image",
        sortOrder: index,
      }));
      const { imageFiles: _imageFiles, ...productData } = data;
      return adminProductService.create({
        ...productData,
        images: uploadedImages.length ? uploadedImages : images,
      } as unknown as Partial<Product>);
    },
    onSuccess: () => {
      toast("success", "Product created successfully");
      router.push("/admin/products");
    },
    onError: (error) => {
      toast("error", error instanceof Error ? error.message : "Failed to create product");
    },
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          New Product
        </h1>
      </motion.div>

      <ProductForm
        onSubmit={(data) => mutation.mutate(data as Record<string, unknown>)}
        onDiscard={() => router.push("/admin/products")}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
