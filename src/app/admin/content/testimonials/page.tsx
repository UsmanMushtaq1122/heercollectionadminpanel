"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Image as ImageIcon,
  Video,
  Instagram,
  MessageCircle,
  Quote,
  Upload,
  Play,
  ExternalLink,
  Loader2,
  X,
  MapPin,
  CheckCircle2,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Testimonial as TestimonialDTO } from "@/types";
import { adminTestimonialService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

interface Testimonial {
  id: string;
  customerName: string;
  customerPhoto: string;
  customerImage?: string;
  location?: string;
  content: string;
  rating: number;
  type: "gallery" | "video" | "instagram" | "story";
  image?: string;
  videoUrl?: string;
  mediaUrl: string;
  active: boolean;
  order: number;
  date: string;
}

function mapTestimonial(t: TestimonialDTO): Testimonial {
  const mediaUrl =
    t.type === "video" || t.type === "story" || t.type === "instagram"
      ? t.videoUrl || t.image || ""
      : t.image || t.videoUrl || "";

  const initials = t.customerName
    ? t.customerName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "HC";

  return {
    id: t.id,
    customerName: t.customerName || "Anonymous",
    customerPhoto: initials || "HC",
    customerImage: t.customerImage,
    location: t.location,
    content: t.content || "",
    rating: t.rating || 5,
    type: t.type || "gallery",
    image: t.image,
    videoUrl: t.videoUrl,
    mediaUrl,
    active: t.isActive !== false,
    order: t.sortOrder ?? 0,
    date: t.createdAt ? t.createdAt.split("T")[0] : "",
  };
}

const typeConfig: Record<
  string,
  { label: string; icon: typeof ImageIcon; color: string; badge: string }
> = {
  gallery: {
    label: "Gallery",
    icon: ImageIcon,
    color: "bg-[#C9A27E]/10 text-[#B8906A] border-[#C9A27E]/20",
    badge: "Photo Review",
  },
  video: {
    label: "Video",
    icon: Video,
    color: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20",
    badge: "9:16 Video",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-50 text-pink-600 border-pink-200",
    badge: "Instagram Reel / Post",
  },
  story: {
    label: "Story",
    icon: MessageCircle,
    color: "bg-blue-50 text-blue-600 border-blue-200",
    badge: "Instagram Story",
  },
};

export default function TestimonialsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rawTestimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => adminTestimonialService.list(),
  });

  const testimonials = (Array.isArray(rawTestimonials) ? rawTestimonials : []).map(
    mapTestimonial
  );

  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    customerName: "",
    location: "",
    content: "",
    rating: 5,
    type: "gallery" as Testimonial["type"],
    mediaUrl: "",
    active: true,
  });

  // Local File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaTab, setMediaTab] = useState<"file" | "url">("file");

  const createMutation = useMutation({
    mutationFn: (data: Partial<TestimonialDTO>) =>
      adminTestimonialService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast("success", "Testimonial created successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });

  const createUploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      adminTestimonialService.createUpload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast("success", "Testimonial and media uploaded successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestimonialDTO> }) =>
      adminTestimonialService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast("success", "Testimonial updated successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });

  const updateUploadMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      adminTestimonialService.updateUpload(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast("success", "Testimonial updated and media uploaded successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTestimonialService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast("success", "Testimonial deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });

  const filtered =
    filterType === "all"
      ? testimonials
      : testimonials.filter((t) => t.type === filterType);

  const resetForm = () => {
    setEditingItem(null);
    setSelectedFile(null);
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    setForm({
      customerName: "",
      location: "",
      content: "",
      rating: 5,
      type: "gallery",
      mediaUrl: "",
      active: true,
    });
    setMediaTab("file");
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditingItem(item);
    setSelectedFile(null);
    setFilePreview(null);
    setForm({
      customerName: item.customerName,
      location: item.location || "",
      content: item.content,
      rating: item.rating,
      type: item.type,
      mediaUrl: item.mediaUrl,
      active: item.active,
    });
    setMediaTab(item.mediaUrl ? "url" : "file");
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo =
      file.type.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name);
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      toast(
        "error",
        "This media format is not supported. Please upload an MP4, WebM, MOV video or JPG, PNG, WEBP image."
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast("error", "File size exceeds the 100MB maximum limit.");
      return;
    }

    // Auto-adjust type based on selected file if appropriate
    if (isVideo && form.type === "gallery") {
      setForm((prev) => ({ ...prev, type: "video" }));
    } else if (isImage && (form.type === "video" || form.type === "story")) {
      setForm((prev) => ({ ...prev, type: "gallery" }));
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      toast("error", "Please provide a customer name.");
      return;
    }

    if (!form.content.trim()) {
      toast("error", "Please provide testimonial content.");
      return;
    }

    // If Instagram type, validate URL if provided
    if (form.type === "instagram" && form.mediaUrl.trim()) {
      const url = form.mediaUrl.trim().toLowerCase();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast("error", "Please enter a valid URL starting with https://");
        return;
      }
    }

    setIsUploading(true);

    try {
      if (selectedFile) {
        // Upload via FormData
        const formData = new FormData();
        formData.append("customerName", form.customerName.trim());
        if (form.location.trim()) {
          formData.append("location", form.location.trim());
        }
        formData.append("content", form.content.trim());
        formData.append("rating", String(form.rating));
        formData.append("type", form.type);
        formData.append("isActive", String(form.active));
        formData.append(
          "sortOrder",
          String(editingItem ? editingItem.order : testimonials.length)
        );

        if (form.type === "video" || form.type === "story") {
          formData.append("video", selectedFile);
        } else {
          formData.append("image", selectedFile);
        }

        if (editingItem) {
          await updateUploadMutation.mutateAsync({
            id: editingItem.id,
            formData,
          });
        } else {
          await createUploadMutation.mutateAsync(formData);
        }
      } else {
        // JSON payload
        const isVideoType =
          form.type === "video" ||
          form.type === "story" ||
          form.type === "instagram";

        const payload: Partial<TestimonialDTO> = {
          customerName: form.customerName.trim(),
          location: form.location.trim() || undefined,
          content: form.content.trim(),
          rating: form.rating,
          type: form.type,
          image: !isVideoType ? form.mediaUrl.trim() || undefined : undefined,
          videoUrl: isVideoType ? form.mediaUrl.trim() || undefined : undefined,
          isActive: form.active,
          sortOrder: editingItem ? editingItem.order : testimonials.length,
        };

        if (editingItem) {
          await updateMutation.mutateAsync({
            id: editingItem.id,
            data: payload,
          });
        } else {
          await createMutation.mutateAsync(payload);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const toggleActive = (id: string) => {
    const item = testimonials.find((t) => t.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.active } });
    }
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const idx = testimonials.findIndex((t) => t.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= testimonials.length) return;
    const current = testimonials[idx];
    const target = testimonials[newIdx];
    updateMutation.mutate({ id: current.id, data: { sortOrder: target.order } });
    updateMutation.mutate({ id: target.id, data: { sortOrder: current.order } });
  };

  const deleteItem = (id: string) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      deleteMutation.mutate(id);
    }
  };

  const isSaving =
    isUploading ||
    createMutation.isPending ||
    createUploadMutation.isPending ||
    updateMutation.isPending ||
    updateUploadMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1400px] min-w-0 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">
                Testimonials & Client Stories
              </h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light text-sm">
                Manage customer testimonials, Instagram stories, 9:16 vertical
                videos, and reviews.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="http://localhost:3000/testimonials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-light tracking-wide border border-[#E8DDD4] text-[#1A1A1A]/70 hover:border-[#C9A27E] hover:text-[#B8906A] rounded bg-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Testimonials Page
              </a>
              <Button
                onClick={openAdd}
                className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Testimonial
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { value: "all", label: "All Stories", icon: Quote },
              { value: "video", label: "Videos", icon: Video },
              { value: "story", label: "Instagram Stories", icon: MessageCircle },
              { value: "instagram", label: "Instagram Posts", icon: Instagram },
              { value: "gallery", label: "Photo Gallery", icon: ImageIcon },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={filterType === value ? "default" : "outline"}
                className={cn(
                  "font-light text-xs uppercase tracking-wide gap-2",
                  filterType === value
                    ? "bg-[#1A1A1A] text-white"
                    : "border-[#E8DDD4] bg-white text-[#1A1A1A]/60 hover:border-[#C9A27E] hover:text-[#B8906A]"
                )}
                onClick={() => setFilterType(value)}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Button>
            ))}
          </div>

          {/* Loading or Empty State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#C9A27E]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-[#E8DDD4]/60">
              <Quote className="w-12 h-12 text-[#C9A27E]/30 mx-auto mb-4" />
              <h3 className="text-lg font-light text-[#1A1A1A] mb-1">
                No testimonials found
              </h3>
              <p className="text-sm text-[#1A1A1A]/50 mb-6">
                {filterType === "all"
                  ? "Start by adding your first client story or Instagram video."
                  : `No testimonials found in the ${filterType} category.`}
              </p>
              <Button
                onClick={openAdd}
                className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Testimonial
              </Button>
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((testimonial, index) => {
                  const config =
                    typeConfig[testimonial.type] || typeConfig.gallery;
                  const TypeIcon = config.icon;
                  const isVideo =
                    testimonial.type === "video" || testimonial.type === "story";
                  const isInstagram = testimonial.type === "instagram";

                  return (
                    <motion.div
                      key={testimonial.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="bg-white border border-[#E8DDD4]/70 shadow-sm h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                        {/* Media Preview Header */}
                        {testimonial.mediaUrl && (
                          <div className="relative w-full bg-[#1A1A1A] overflow-hidden group">
                            {isVideo ? (
                              <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center">
                                <video
                                  src={testimonial.mediaUrl}
                                  className="w-full h-full object-cover opacity-80"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#1A1A1A] shadow-lg">
                                    <Play className="w-4 h-4 fill-[#1A1A1A] ml-0.5" />
                                  </div>
                                </div>
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] uppercase tracking-wider bg-black/70 text-white rounded">
                                  9:16 Story
                                </span>
                              </div>
                            ) : isInstagram ? (
                              <div className="aspect-[16/9] w-full bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-amber-500/20 flex flex-col items-center justify-center p-4 text-center">
                                <Instagram className="w-8 h-8 text-pink-600 mb-2" />
                                <p className="text-xs font-medium text-[#1A1A1A] truncate max-w-full">
                                  Instagram Link
                                </p>
                                <a
                                  href={testimonial.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-pink-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                  Open Post <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F8F5F2]">
                                <img
                                  src={testimonial.mediaUrl}
                                  alt={testimonial.customerName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <CardContent className="p-5 flex flex-col flex-1">
                          {/* Top Author Row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {testimonial.customerImage ? (
                                <img
                                  src={testimonial.customerImage}
                                  alt={testimonial.customerName}
                                  className="w-10 h-10 rounded-full object-cover border border-[#E8DDD4]"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-light tracking-wider">
                                  {testimonial.customerPhoto}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-[#1A1A1A] text-sm">
                                  {testimonial.customerName}
                                </p>
                                {testimonial.location && (
                                  <p className="text-[11px] text-[#1A1A1A]/50 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {testimonial.location}
                                  </p>
                                )}
                                <div className="flex gap-0.5 mt-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "w-3 h-3",
                                        i < testimonial.rating
                                          ? "fill-[#C9A27E] text-[#B8906A]"
                                          : "text-[#E8DDD4]"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                "text-[9px] uppercase tracking-wider font-medium border",
                                config.color
                              )}
                            >
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>

                          <Quote className="w-5 h-5 text-[#B8906A]/20 mb-2" />
                          <p className="text-sm text-[#1A1A1A]/70 font-light leading-relaxed flex-1 line-clamp-3">
                            {testimonial.content}
                          </p>

                          <div className="flex items-center justify-between mt-3 pt-2">
                            {testimonial.active ? (
                              <Badge className="text-[9px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                Published
                              </Badge>
                            ) : (
                              <Badge className="text-[9px] uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
                                Draft / Hidden
                              </Badge>
                            )}

                            {testimonial.date && (
                              <span className="text-[11px] text-[#1A1A1A]/40">
                                {testimonial.date}
                              </span>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1A1A1A]/5">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                onClick={() => moveItem(testimonial.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                onClick={() => moveItem(testimonial.id, "down")}
                                disabled={index === filtered.length - 1}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </Button>
                              <GripVertical className="w-3.5 h-3.5 text-[#1A1A1A]/15" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={testimonial.active}
                                onCheckedChange={() =>
                                  toggleActive(testimonial.id)
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEdit(testimonial)}
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#1A1A1A]/40" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => deleteItem(testimonial.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#DC2626]/40 hover:text-[#DC2626]" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-0 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-light tracking-wide text-[#1A1A1A]">
              {editingItem ? "Edit Testimonial" : "Create Testimonial"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Customer Name & Location */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/60 font-medium mb-1.5 block">
                  Customer Name *
                </label>
                <Input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  placeholder="e.g. Ayesha Khan"
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/60 font-medium mb-1.5 block">
                  Location / City
                </label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="e.g. Lahore, Pakistan"
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
            </div>

            {/* Testimonial Content */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/60 font-medium mb-1.5 block">
                Testimonial Content *
              </label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                placeholder="What did the customer say about Heer Collection..."
                className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light min-h-[90px] focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/60 font-medium mb-1.5 block">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setForm({ ...form, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 cursor-pointer transition-colors",
                        star <= form.rating
                          ? "fill-[#C9A27E] text-[#B8906A]"
                          : "text-[#E8DDD4] hover:text-[#B8906A]/50"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Type Selector */}
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/60 font-medium mb-1.5 block">
                Content Type
              </label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm({ ...form, type: val as Testimonial["type"] })
                }
              >
                <SelectTrigger className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">
                    Instagram Story (9:16 Vertical Video)
                  </SelectItem>
                  <SelectItem value="video">
                    Customer Video Review (Video File / URL)
                  </SelectItem>
                  <SelectItem value="instagram">
                    External Instagram Post / Reel (Link)
                  </SelectItem>
                  <SelectItem value="gallery">
                    Photo Review (Image File / URL)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media Upload / URL Section */}
            <div className="border border-[#E8DDD4] rounded-lg p-3 bg-[#FDFBF7]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/70 font-medium">
                  {form.type === "video" || form.type === "story"
                    ? "Video / Story Media"
                    : form.type === "instagram"
                    ? "Instagram Link"
                    : "Photo Media"}
                </label>
                {form.type !== "instagram" && (
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMediaTab("file")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-colors",
                        mediaTab === "file"
                          ? "bg-[#1A1A1A] text-white"
                          : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                      )}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaTab("url")}
                      className={cn(
                        "px-2 py-0.5 rounded transition-colors",
                        mediaTab === "url"
                          ? "bg-[#1A1A1A] text-white"
                          : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                      )}
                    >
                      Paste URL
                    </button>
                  </div>
                )}
              </div>

              {mediaTab === "file" && form.type !== "instagram" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      form.type === "video" || form.type === "story"
                        ? "video/mp4,video/webm,video/quicktime,video/*"
                        : "image/jpeg,image/png,image/webp,image/gif"
                    }
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="relative border border-[#C9A27E] rounded p-3 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {form.type === "video" || form.type === "story" ? (
                          <Video className="w-5 h-5 text-[#B8906A] shrink-0" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-[#B8906A] shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-medium text-[#1A1A1A] truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-[#1A1A1A]/50">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8DDD4] hover:border-[#C9A27E] rounded-lg p-5 text-center cursor-pointer bg-white transition-colors"
                    >
                      <Upload className="w-6 h-6 text-[#C9A27E] mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-[#1A1A1A]">
                        {form.type === "video" || form.type === "story"
                          ? "Select a 9:16 Video / Story file"
                          : "Select an Image file"}
                      </p>
                      <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">
                        {form.type === "video" || form.type === "story"
                          ? "MP4, WebM, MOV up to 100MB"
                          : "JPG, PNG, WebP up to 25MB"}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    value={form.mediaUrl}
                    onChange={(e) =>
                      setForm({ ...form, mediaUrl: e.target.value })
                    }
                    placeholder={
                      form.type === "instagram"
                        ? "https://www.instagram.com/reel/... or /stories/..."
                        : form.type === "video" || form.type === "story"
                        ? "https://res.cloudinary.com/.../video.mp4"
                        : "https://.../photo.jpg"
                    }
                    className="border-[#E8DDD4] bg-white font-light text-xs focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                  {form.type === "instagram" && (
                    <p className="text-[11px] text-[#1A1A1A]/50 mt-1">
                      Links will render as verified Instagram cards with a
                      direct link to Instagram.
                    </p>
                  )}
                </div>
              )}

              {/* Media Preview Box */}
              {(filePreview || form.mediaUrl) && (
                <div className="mt-3 pt-2 border-t border-[#E8DDD4]/50">
                  <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/50 mb-1">
                    Live Preview:
                  </p>
                  <div className="relative max-h-48 overflow-hidden rounded bg-black/5 flex items-center justify-center">
                    {(form.type === "video" || form.type === "story") &&
                    (filePreview || form.mediaUrl) ? (
                      <video
                        src={filePreview || form.mediaUrl}
                        controls
                        className="max-h-48 w-auto rounded object-contain"
                      />
                    ) : form.type === "instagram" ? (
                      <div className="p-3 bg-pink-50 text-pink-700 text-xs flex items-center gap-2 rounded">
                        <Instagram className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {form.mediaUrl || "https://instagram.com/..."}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={filePreview || form.mediaUrl}
                        alt="Preview"
                        className="max-h-48 w-auto rounded object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Visibility / Active Switch */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/70 font-medium block">
                  Publish on Storefront
                </label>
                <p className="text-[11px] text-[#1A1A1A]/40 font-light">
                  When active, this story is immediately visible to website
                  visitors.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, active: checked })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#E8DDD4]/60">
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => setDialogOpen(false)}
                className="border-[#E8DDD4] text-[#1A1A1A]/60 font-light"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide min-w-[130px]"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {selectedFile ? "Uploading..." : "Saving..."}
                  </span>
                ) : editingItem ? (
                  "Save Changes"
                ) : (
                  "Add Testimonial"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
