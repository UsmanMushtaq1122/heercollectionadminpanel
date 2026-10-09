"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "@/components/products/product-form";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/types";
import { adminProductService } from "@/lib/admin-services";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => adminProductService.get(productId),
  });

  const updateMutation = useMutation({
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
      return adminProductService.update(productId, {
        ...productData,
        images: uploadedImages.length ? [...images.filter((image) => !image.url.startsWith("blob:")), ...uploadedImages] : images,
      } as unknown as Partial<Product>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast("success", "Product updated successfully");
      router.push("/admin/products");
    },
    onError: (error) => {
      toast("error", error instanceof Error ? error.message : "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminProductService.remove(productId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // A product with order history is archived rather than deleted.
      toast(data.archived ? "info" : "success", data.message);
      router.push("/admin/products");
    },
    onError: (error) => {
      toast("error", error instanceof Error ? error.message : "Failed to delete product");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => adminProductService.duplicate(productId),
    onSuccess: (data: { success: boolean; data: Product }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("success", "Product duplicated");
      router.push(`/admin/products/${data.data.id}/edit`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-sm" />
            <Skeleton className="h-64 w-full rounded-sm" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-sm" />
            <Skeleton className="h-48 w-full rounded-sm" />
            <Skeleton className="h-40 w-full rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#1A1A1A]/50">Product not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/admin/products")}
        >
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          Edit Product
        </h1>
      </motion.div>

      <ProductForm
        key={product.id}
        initialData={product}
        onSubmit={(data) => updateMutation.mutate(data)}
        onDiscard={() => router.push("/admin/products")}
        isLoading={updateMutation.isPending}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  Duplicate this product
                </p>
                <p className="text-xs text-[#1A1A1A]/50">
                  Create a copy of this product as a new draft.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate()}
              >
                <Copy className="h-4 w-4" />
                Duplicate Product
              </Button>
            </div>
            <div className="my-4 h-px bg-[#E8DDD4]/50" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">
                  Delete this product
                </p>
                <p className="text-xs text-[#1A1A1A]/50">
                  Permanently remove this product. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{product.name}&rdquo;? This action
            cannot be undone.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
