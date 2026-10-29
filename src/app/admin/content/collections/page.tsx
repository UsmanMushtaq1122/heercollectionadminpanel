"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Search,
  Image as ImageIcon,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  Layers,
  Package,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify, cn } from "@/lib/utils";
import type { Collection } from "@/types";
import { adminCollectionService, adminProductService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

async function optimizeCollectionImage(file: File): Promise<File> {
  const maxBytes = 150 * 1024;
  const maxDimension = 1600;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const loadedImage = new globalThis.Image();
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

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => adminCollectionService.list(),
  });
  const createMutation = useMutation({
    mutationFn: (data: Partial<Collection>) => adminCollectionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast("success", "Collection created successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collection> }) => adminCollectionService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections"] }),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCollectionService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast("success", "Collection deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("error", "Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("error", "Image must be 10MB or smaller");
      return;
    }
    try {
      const optimizedFile = await optimizeCollectionImage(file);
      setImageFile(optimizedFile);
      setImagePreview(URL.createObjectURL(optimizedFile));
      setFormData((prev) => ({ ...prev, image: "" }));
    } catch {
      toast("error", "The image could not be processed. Please choose another image.");
    }
  };

  const filteredCollections = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenDialog = (col?: Collection) => {
    setImageFile(null);
    setIsDraggingImage(false);
    if (col) {
      setEditingCollection(col);
      setImagePreview(col.image || "");
      setFormData({
        name: col.name,
        slug: col.slug,
        description: col.description || "",
        image: col.image || "",
        isActive: col.isActive,
      });
    } else {
      setEditingCollection(null);
      setImagePreview("");
      setFormData({
        name: "",
        slug: "",
        description: "",
        image: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCollection ? prev.slug : slugify(name),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      let finalImageUrl = formData.image;
      if (imageFile) {
        const uploaded = await adminProductService.uploadImages([imageFile]);
        if (uploaded && uploaded[0]?.url) {
          finalImageUrl = uploaded[0].url;
        }
      }

      const payload: Partial<Collection> = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name),
        description: formData.description,
        image:
          finalImageUrl ||
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80",
        isActive: formData.isActive,
        sortOrder: editingCollection ? editingCollection.sortOrder : collections.length,
      };

      if (editingCollection) {
        updateMutation.mutate(
          { id: editingCollection.id, data: payload },
          { onSuccess: () => toast("success", "Collection updated successfully") }
        );
      } else {
        createMutation.mutate(payload);
      }

      setIsDialogOpen(false);
    } catch (err) {
      toast("error", getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this editorial collection?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string) => {
    const item = collections.find((c) => c.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.isActive } });
    }
  };

  const moveOrder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= collections.length) return;

    const current = collections[index];
    const target = collections[targetIndex];
    updateMutation.mutate({ id: current.id, data: { sortOrder: target.sortOrder } });
    updateMutation.mutate({ id: target.id, data: { sortOrder: current.sortOrder } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#C9A27E]" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
              Editorial Collections
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#1A1A1A]/60">
            Manage seasonal lookbooks, campaign edits, and storefront hero
            collections.
          </p>
        </div>

        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90"
        >
          <Plus className="mr-2 h-4 w-4 text-[#C9A27E]" />
          Create Collection
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-[#1A1A1A]/10 bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#C9A27E]/15 text-[#C9A27E]">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/50">
                Total Collections
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                {collections.length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1A1A1A]/10 bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-emerald-500/15 text-emerald-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/50">
                Active Storefront
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                {collections.filter((c) => c.isActive).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1A1A1A]/10 bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-purple-500/15 text-purple-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/50">
                Tagged Products
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                {collections.reduce((acc, c) => acc + (c.productCount || 0), 0)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredCollections.map((col, index) => (
              <motion.div
                key={col.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group overflow-hidden border border-[#1A1A1A]/10 bg-white transition-all hover:shadow-md">
                  {/* Image cover */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#E8DDD4]">
                    {col.image ? (
                      <img
                        src={col.image}
                        alt={col.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#1A1A1A]/30">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge
                        variant={col.isActive ? "default" : "secondary"}
                        className={
                          col.isActive
                            ? "bg-[#1A1A1A] text-[#C9A27E]"
                            : "bg-neutral-200 text-neutral-600"
                        }
                      >
                        {col.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded bg-black/60 p-1 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveOrder(index, "up")}
                        disabled={index === 0}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrder(index, "down")}
                        disabled={index === collections.length - 1}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                          {col.name}
                        </h3>
                        <p className="text-xs text-[#C9A27E] font-mono">
                          /collections/{col.slug}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[#C9A27E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B8906A]">
                        {col.productCount || 0} items
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#1A1A1A]/70 line-clamp-2">
                      {col.description || "No description provided."}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[#1A1A1A]/5 pt-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={col.isActive}
                          onCheckedChange={() => handleToggleStatus(col.id)}
                        />
                        <span className="text-xs text-[#1A1A1A]/60">
                          {col.isActive ? "Visible" : "Hidden"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(col)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(col.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <Card className="border border-[#1A1A1A]/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#1A1A1A]/10 bg-[#F8F5F2] text-xs uppercase tracking-wider text-[#1A1A1A]/70">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Collection</th>
                  <th className="px-5 py-3.5 font-semibold">Slug & Route</th>
                  <th className="px-5 py-3.5 font-semibold">Products</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/5">
                {filteredCollections.map((col, index) => (
                  <tr key={col.id} className="hover:bg-[#F8F5F2]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={col.image || "/placeholder.jpg"}
                          alt={col.name}
                          className="h-10 w-14 rounded-sm object-cover bg-[#E8DDD4]"
                        />
                        <div>
                          <p className="font-serif font-bold text-[#1A1A1A]">
                            {col.name}
                          </p>
                          <p className="text-xs text-[#1A1A1A]/50 line-clamp-1 max-w-xs">
                            {col.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[#C9A27E]">
                      /collections/{col.slug}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-[#1A1A1A]">
                      {col.productCount || 0} items
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={col.isActive ? "default" : "secondary"}
                        className={
                          col.isActive
                            ? "bg-[#1A1A1A] text-[#C9A27E]"
                            : "bg-neutral-200 text-neutral-600"
                        }
                      >
                        {col.isActive ? "Active" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(col)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(col.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex flex-col max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden border-0 bg-white p-0 sm:max-h-[calc(100dvh-3rem)]">
          <DialogHeader className="shrink-0 border-b border-[#E8DDD4] px-4 py-4 pr-14 sm:px-6 sm:py-5">
            <DialogTitle className="font-serif text-xl text-[#1A1A1A]">
              {editingCollection ? "Edit Collection" : "New Editorial Collection"}
            </DialogTitle>
            <p className="text-xs text-[#1A1A1A]/50">
              Create a storefront collection with a story and cover image.
            </p>
            <DialogClose
              type="button"
              aria-label="Close collection form"
              title="Close"
              onClick={() => setIsDialogOpen(false)}
            />
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
            <Input
              label="Collection Name"
              placeholder="e.g. Summer Edit 2026"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />

            <Input
              label="URL Slug"
              placeholder="summer-edit-2026"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
            />

            <Textarea
              label="Description & Campaign Story"
              placeholder="Breezy silhouettes and handcrafted embroidery..."
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                IMAGE
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") imageInputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingImage(true);
                }}
                onDragLeave={() => setIsDraggingImage(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingImage(false);
                  const droppedFile = event.dataTransfer.files[0];
                  if (droppedFile) selectImage(droppedFile);
                }}
                className={cn(
                  "relative flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed bg-[#F8F5F2]/50 p-4 text-center transition-colors",
                  isDraggingImage ? "border-[#C9A27E] bg-[#C9A27E]/10" : "border-[#E8DDD4] hover:border-[#C9A27E]"
                )}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Collection preview" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/35" />
                    <span className="relative z-10 rounded-sm bg-white/90 px-3 py-2 text-sm text-[#1A1A1A]">
                      Click or drop to replace image
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-8 w-8 text-[#1A1A1A]/40" />
                    <span className="text-sm text-[#1A1A1A]/60">Click to upload or drag and drop</span>
                    <span className="mt-1 text-xs text-[#1A1A1A]/40">PNG, JPG, WebP up to 10MB (optimized automatically)</span>
                  </>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    if (selectedFile) selectImage(selectedFile);
                  }}
                />
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setImageFile(null);
                    setImagePreview("");
                    setFormData((current) => ({ ...current, image: "" }));
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  className="mt-2 text-xs text-[#1A1A1A]/50 underline hover:text-[#1A1A1A]"
                >
                  Remove image
                </button>
              )}
              {!imageFile && (
                <div className="mt-4 rounded-sm border border-[#E8DDD4] bg-white p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1A1A]/50">
                      Or use an image URL
                    </span>
                  </div>
                  <Input
                    value={formData.image}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, image: e.target.value }));
                      setImagePreview(e.target.value);
                    }}
                    type="url"
                    inputMode="url"
                    aria-label="Collection image URL"
                    placeholder="https://example.com/collection-image.jpg"
                    className="h-11 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-[#1A1A1A]/40">
                    Use a publicly accessible HTTPS image URL, or upload an image from your device above.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  Publish Status
                </p>
                <p className="text-xs text-[#1A1A1A]/50">
                  Visible in storefront collections list
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-[#E8DDD4] bg-white px-4 py-4 sm:px-6 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="w-full border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#F8F5F2] sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving}
              className="w-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 sm:w-auto"
            >
              {isSaving ? "Saving..." : editingCollection ? "Save Changes" : "Create Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
