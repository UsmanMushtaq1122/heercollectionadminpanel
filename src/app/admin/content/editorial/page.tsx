"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Link as LinkIcon,
  GripVertical,
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
import { cn, slugify } from "@/lib/utils";
import { Collection as CollectionDTO } from "@/types";
import { adminEditorialService, adminProductService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

interface EditorialItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  link: string;
  category: string;
  active: boolean;
  order: number;
  date: string;
}

function mapEditorial(c: any): EditorialItem {
  return {
    id: c.id,
    title: c.title || c.name || "",
    subtitle: c.subtitle || c.slug || "",
    description: c.description || "",
    imageUrl: c.imageUrl || c.image || "",
    link: c.link || (c.slug ? `/editorial/${c.slug}` : ""),
    category: c.category || "Editorial",
    active: c.active !== undefined ? c.active : (c.isActive !== undefined ? c.isActive : true),
    order: c.order !== undefined ? c.order : (c.sortOrder || 0),
    date: c.date || (c.createdAt ? c.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
  };
}

export default function EditorialPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rawEditorials = [] } = useQuery({
    queryKey: ["editorials"],
    queryFn: () => adminEditorialService.list(),
  });
  const editorials = rawEditorials.map(mapEditorial);
  const createMutation = useMutation({
    mutationFn: (data: Partial<CollectionDTO>) => adminEditorialService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorials"] });
      toast("success", "Editorial created successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CollectionDTO> }) => adminEditorialService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorials"] });
      toast("success", "Editorial updated successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminEditorialService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editorials"] });
      toast("success", "Editorial deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditorialItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    imageUrl: "",
    link: "",
    category: "",
    active: true,
  });

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("error", "Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("error", "Image must be 10MB or smaller");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, imageUrl: "" }));
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      subtitle: editingItem ? prev.subtitle : slugify(title),
    }));
  };

  const openAdd = () => {
    setEditingItem(null);
    setImageFile(null);
    setImagePreview("");
    setIsDraggingImage(false);
    setForm({
      title: "",
      subtitle: "",
      description: "",
      imageUrl: "",
      link: "",
      category: "Styling",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (item: EditorialItem) => {
    setEditingItem(item);
    setImageFile(null);
    setImagePreview(item.imageUrl || "");
    setIsDraggingImage(false);
    setForm({
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      imageUrl: item.imageUrl,
      link: item.link,
      category: item.category,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;

    setIsSaving(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (imageFile) {
        const uploaded = await adminProductService.uploadImages([imageFile]);
        if (uploaded && uploaded[0]?.url) {
          finalImageUrl = uploaded[0].url;
        }
      }

      const generatedSlug = form.subtitle || slugify(form.title);

      const payload: any = {
        name: form.title,
        title: form.title,
        slug: generatedSlug,
        subtitle: generatedSlug,
        description: form.description || undefined,
        image: finalImageUrl || undefined,
        imageUrl: finalImageUrl || undefined,
        link: form.link || undefined,
        category: form.category || undefined,
        isActive: form.active,
        active: form.active,
        sortOrder: editingItem ? editingItem.order : editorials.length,
      };

      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem.id, data: payload },
          { onSuccess: () => toast("success", "Editorial updated successfully") }
        );
      } else {
        createMutation.mutate(payload);
      }

      setDialogOpen(false);
    } catch (err) {
      toast("error", getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = (id: string) => {
    const item = editorials.find((e) => e.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.active } });
    }
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const idx = editorials.findIndex((e) => e.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= editorials.length) return;
    const current = editorials[idx];
    const target = editorials[newIdx];
    updateMutation.mutate({ id: current.id, data: { sortOrder: target.order } });
    updateMutation.mutate({ id: target.id, data: { sortOrder: current.order } });
  };

  const deleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this editorial article?")) {
      deleteMutation.mutate(id);
    }
  };

  const categoryColors: Record<string, string> = {
    Culture: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20",
    Styling: "bg-[#C9A27E]/10 text-[#B8906A] border-[#C9A27E]/20",
    "Behind the Scenes": "bg-blue-50 text-blue-600 border-blue-200",
    Craft: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Sustainability: "bg-[#E8DDD4]/40 text-[#1A1A1A]/60 border-[#E8DDD4]",
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1400px] min-w-0 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">Editorial</h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">
                {editorials.length} editorial articles
              </p>
            </div>
            <Button
              onClick={openAdd}
              className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Editorial
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {editorials.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="group bg-white border border-[#1A1A1A]/10 shadow-sm overflow-hidden h-full transition-all hover:shadow-md">
                    <CardContent className="p-0">
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#E8DDD4]">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#1A1A1A]/30">
                            <ImageIcon className="h-10 w-10" />
                          </div>
                        )}
                        {!item.active && (
                          <div className="absolute top-3 right-3">
                            <Badge className="text-[9px] uppercase tracking-wider bg-[#E8DDD4]/80 text-[#1A1A1A]/60 border-0">
                              Draft
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {item.category && (
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  className={cn(
                                    "text-[9px] uppercase tracking-wider font-medium border",
                                    categoryColors[item.category] || "bg-[#E8DDD4]/40 text-[#1A1A1A]/50 border-[#E8DDD4]"
                                  )}
                                >
                                  {item.category}
                                </Badge>
                              </div>
                            )}
                            <h3 className="font-medium text-[#1A1A1A]">{item.title}</h3>
                            {item.subtitle && (
                              <p className="text-xs text-[#C9A27E] font-mono mt-0.5">
                                {item.subtitle.startsWith("/") ? item.subtitle : `/editorial/${item.subtitle}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#1A1A1A]/50 font-light line-clamp-2 mb-3">
                          {item.description || "No description provided."}
                        </p>
                        {item.link && (
                          <p className="text-xs text-[#B8906A] font-light flex items-center gap-1 mb-4">
                            <LinkIcon className="w-3 h-3" />
                            {item.link}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-[#1A1A1A]/5">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A]"
                              onClick={() => moveItem(item.id, "up")}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A]"
                              onClick={() => moveItem(item.id, "down")}
                              disabled={index === editorials.length - 1}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                            <GripVertical className="w-3.5 h-3.5 text-[#1A1A1A]/15" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.active}
                              onCheckedChange={() => toggleActive(item.id)}
                            />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                              <Pencil className="w-3.5 h-3.5 text-[#1A1A1A]/40" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-[#DC2626]/40 hover:text-[#DC2626]" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Add / Edit Dialog - Closeable & Scrollable matching Collection Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden border-0 bg-white p-0 sm:max-h-[calc(100dvh-3rem)]">
          <DialogHeader className="shrink-0 border-b border-[#E8DDD4] px-4 py-4 pr-14 sm:px-6 sm:py-5">
            <DialogTitle className="font-serif text-xl text-[#1A1A1A]">
              {editingItem ? "Edit Editorial" : "New Editorial Article"}
            </DialogTitle>
            <p className="text-xs text-[#1A1A1A]/50">
              Create an editorial story with featured content and cover image.
            </p>
            <DialogClose
              type="button"
              aria-label="Close editorial form"
              title="Close"
              onClick={() => setDialogOpen(false)}
            />
          </DialogHeader>

          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <Input
                label="Editorial Title"
                placeholder="e.g. Summer Edit 2026"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />

              <Input
                label="URL Slug"
                placeholder="summer-edit-2026"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
              />

              <Textarea
                label="Description & Campaign Story"
                placeholder="Breezy silhouettes and handcrafted embroidery..."
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
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
                      <img src={imagePreview} alt="Editorial preview" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/35" />
                      <span className="relative z-10 rounded-sm bg-white/90 px-3 py-2 text-sm text-[#1A1A1A]">
                        Click or drop to replace image
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-3 h-8 w-8 text-[#1A1A1A]/40" />
                      <span className="text-sm text-[#1A1A1A]/60">Click to upload or drag and drop</span>
                      <span className="mt-1 text-xs text-[#1A1A1A]/40">PNG, JPG, WebP up to 10MB</span>
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
                      setForm((current) => ({ ...current, imageUrl: "" }));
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    className="mt-2 text-xs text-[#1A1A1A]/50 underline hover:text-[#1A1A]"
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
                      value={form.imageUrl}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, imageUrl: e.target.value }));
                        setImagePreview(e.target.value);
                      }}
                      type="url"
                      inputMode="url"
                      aria-label="Editorial image URL"
                      placeholder="https://example.com/editorial-image.jpg"
                      className="h-11 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-[#1A1A1A]/40">
                      Use a publicly accessible HTTPS image URL, or upload an image from your device above.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Category"
                  placeholder="e.g. Culture, Styling, Craft"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                />

                <Input
                  label="Link URL (Optional)"
                  placeholder="e.g. /editorial/summer-edit-2026"
                  value={form.link}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, link: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    Publish Status
                  </p>
                  <p className="text-xs text-[#1A1A1A]/50">
                    Visible in storefront editorial stories
                  </p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, active: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-[#E8DDD4] px-4 py-4 sm:px-6 sm:py-5">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || isSaving}
              className="w-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 sm:w-auto"
            >
              {isSaving
                ? "Saving..."
                : editingItem
                ? "Save Changes"
                : "Create Editorial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
