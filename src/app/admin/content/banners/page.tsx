"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image,
  GripVertical,
  Link as LinkIcon,
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
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Banner as BannerDTO } from "@/types";
import { adminBannerService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  link: string;
  buttonText: string;
  active: boolean;
  order: number;
}

interface EditorialBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  link: string;
  active: boolean;
  order: number;
}

interface AnnouncementBar {
  id: string;
  text: string;
  link: string;
  active: boolean;
  bgColor: string;
  textColor: string;
}

function mapHeroBanner(b: BannerDTO): HeroBanner {
  return { id: b.id, title: b.title, subtitle: b.subtitle || "", imageUrl: b.image, mobileImageUrl: b.mobileImage || "", link: b.link || "", buttonText: b.buttonText || "", active: b.isActive, order: b.sortOrder };
}
function mapEditorialBanner(b: BannerDTO): EditorialBanner {
  return { id: b.id, title: b.title, subtitle: b.subtitle || "", imageUrl: b.image, mobileImageUrl: b.mobileImage || "", link: b.link || "", active: b.isActive, order: b.sortOrder };
}
function mapAnnouncement(b: BannerDTO): AnnouncementBar {
  return { id: b.id, text: b.title, link: b.link || "", active: b.isActive, bgColor: "#1A1A1A", textColor: "#F8F5F2" };
}

export default function BannersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allBanners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: () => adminBannerService.list(),
  });
  const heroBanners = allBanners.filter((b) => b.type === "hero").map(mapHeroBanner);
  const editorialBanners = allBanners.filter((b) => b.type === "editorial").map(mapEditorialBanner);
  const announcements = allBanners.filter((b) => b.type === "announcement").map(mapAnnouncement);
  const createMutation = useMutation<unknown, unknown, Partial<BannerDTO> | FormData>({
    mutationFn: (data) => (data instanceof FormData ? adminBannerService.createUpload(data) : adminBannerService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast("success", "Banner created successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const updateMutation = useMutation<unknown, unknown, { id: string; data: Partial<BannerDTO> | FormData }>({
    mutationFn: ({ id, data }) => (data instanceof FormData ? adminBannerService.updateUpload(id, data) : adminBannerService.update(id, data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminBannerService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast("success", "Banner deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"hero" | "editorial" | "announcement">("hero");
  // Desktop image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Mobile image
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState("");
  const [isDraggingMobile, setIsDraggingMobile] = useState(false);
  const mobileImageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    mobileImageUrl: "",
    link: "",
    buttonText: "",
    active: true,
    text: "",
    bgColor: "#1A1A1A",
    textColor: "#F8F5F2",
  });

  const openAdd = (type: typeof dialogType) => {
    setEditingBanner(null);
    setDialogType(type);
    setImageFile(null);
    setImagePreview("");
    setMobileImageFile(null);
    setMobileImagePreview("");
    setForm({
      title: "",
      subtitle: "",
      imageUrl: "",
      mobileImageUrl: "",
      link: "",
      buttonText: "",
      active: true,
      text: "",
      bgColor: "#1A1A1A",
      textColor: "#F8F5F2",
    });
    setDialogOpen(true);
  };

  const openEdit = (banner: any, type: typeof dialogType) => {
    setEditingBanner(banner);
    setDialogType(type);
    setImageFile(null);
    setMobileImageFile(null);
    setImagePreview(type === "announcement" ? "" : banner.imageUrl || "");
    setMobileImagePreview(type === "announcement" ? "" : banner.mobileImageUrl || "");
    if (type === "announcement") {
      setForm({
        ...form,
        text: banner.text,
        link: banner.link,
        active: banner.active,
        bgColor: banner.bgColor,
        textColor: banner.textColor,
      });
    } else {
      setForm({
        ...form,
        title: banner.title,
        subtitle: banner.subtitle || "",
        imageUrl: banner.imageUrl,
        mobileImageUrl: banner.mobileImageUrl || "",
        link: banner.link,
        buttonText: banner.buttonText || "",
        active: banner.active,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (dialogType === "hero" || dialogType === "editorial") {
      const bannerData: Partial<BannerDTO> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        image: form.imageUrl.trim() || undefined,
        mobileImage: form.mobileImageUrl.trim() || undefined,
        link: form.link.trim() || undefined,
        buttonText: dialogType === "hero" ? (form.buttonText.trim() || undefined) : undefined,
        type: dialogType,
        isActive: form.active,
        sortOrder: editingBanner ? editingBanner.order : (dialogType === "hero" ? heroBanners.length : editorialBanners.length),
      };

      let payload: Partial<BannerDTO> | FormData = bannerData;
      if (imageFile || mobileImageFile) {
        const uploadPayload = new FormData();
        uploadPayload.append("title", bannerData.title || "");
        uploadPayload.append("subtitle", bannerData.subtitle || "");
        uploadPayload.append("link", bannerData.link || "");
        uploadPayload.append("type", dialogType);
        uploadPayload.append("isActive", String(form.active));
        uploadPayload.append("sortOrder", String(bannerData.sortOrder ?? 0));
        if (dialogType === "hero") uploadPayload.append("buttonText", bannerData.buttonText || "");
        if (imageFile) uploadPayload.append("image", imageFile);
        else if (bannerData.image) uploadPayload.append("imageUrl", bannerData.image);
        if (mobileImageFile) uploadPayload.append("mobileImage", mobileImageFile);
        else if (bannerData.mobileImage) uploadPayload.append("mobileImageUrl", bannerData.mobileImage);
        payload = uploadPayload;
      }
      if (editingBanner) {
        updateMutation.mutate({ id: editingBanner.id, data: payload }, { onSuccess: () => toast("success", "Banner updated successfully") });
      } else {
        createMutation.mutate(payload);
      }
    } else {
      const payload: Partial<BannerDTO> = {
        title: form.text,
        link: form.link || undefined,
        type: "announcement",
        isActive: form.active,
        sortOrder: editingBanner ? 0 : announcements.length,
      };
      if (editingBanner) {
        updateMutation.mutate({ id: editingBanner.id, data: payload }, { onSuccess: () => toast("success", "Banner updated successfully") });
      } else {
        createMutation.mutate(payload);
      }
    }
    setDialogOpen(false);
  };

  const selectImage = (file: File | undefined) => {
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

  const selectMobileImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("error", "Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("error", "Image must be 10MB or smaller");
      return;
    }
    setMobileImageFile(file);
    setMobileImagePreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, mobileImageUrl: "" }));
  };

  const toggleActive = (id: string, type: "hero" | "editorial" | "announcement") => {
    const all = [...heroBanners, ...editorialBanners, ...announcements];
    const item = all.find((b) => b.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.active } });
    }
  };

  const moveItem = (
    id: string,
    direction: "up" | "down",
    type: "hero" | "editorial"
  ) => {
    const list = type === "hero" ? heroBanners : editorialBanners;
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;
    const current = list[idx];
    const target = list[newIdx];
    updateMutation.mutate({ id: current.id, data: { sortOrder: target.order } });
    updateMutation.mutate({ id: target.id, data: { sortOrder: current.order } });
  };

  const deleteItem = (id: string, type: "hero" | "editorial" | "announcement") => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1400px] min-w-0 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">Banners</h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">Manage homepage banners and announcements</p>
            </div>
          </div>

          <Tabs defaultValue="hero" className="space-y-6">
            <TabsList className="bg-white border border-[#1A1A1A]/10 p-1">
              <TabsTrigger value="hero" className="font-light text-sm tracking-wide data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white">
                Hero Banners
              </TabsTrigger>
              <TabsTrigger value="editorial" className="font-light text-sm tracking-wide data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white">
                Editorial Banners
              </TabsTrigger>
              <TabsTrigger value="announcement" className="font-light text-sm tracking-wide data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white">
                Announcement Bar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hero" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => openAdd("hero")}
                  className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hero Banner
                </Button>
              </div>
              <AnimatePresence mode="popLayout">
                {heroBanners.map((banner, index) => (
                  <motion.div
                    key={banner.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex min-w-0 flex-col sm:flex-row">
                          <div className="h-40 w-full shrink-0 overflow-hidden bg-[#F8F5F2] sm:w-64">
                            <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A]/10 to-[#C9A27E]/10 flex items-center justify-center">
                              <Image className="w-10 h-10 text-[#1A1A1A]/20" />
                            </div>
                          </div>
                          <div className="flex-1 p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-[#1A1A1A]">{banner.title}</h3>
                                {!banner.active && (
                                  <Badge className="text-[9px] uppercase tracking-wider bg-[#E8DDD4]/40 text-[#1A1A1A]/40 border-0">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[#1A1A1A]/50 font-light">{banner.subtitle}</p>
                              <p className="text-xs text-[#B8906A] mt-1 font-light flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" />
                                {banner.link}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(banner.id, "up", "hero")}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(banner.id, "down", "hero")}
                                  disabled={index === heroBanners.length - 1}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                                <GripVertical className="w-4 h-4 text-[#1A1A1A]/15" />
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={banner.active}
                                  onCheckedChange={() => toggleActive(banner.id, "hero")}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEdit(banner, "hero")}
                                >
                                  <Pencil className="w-4 h-4 text-[#1A1A1A]/40" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => deleteItem(banner.id, "hero")}
                                >
                                  <Trash2 className="w-4 h-4 text-[#DC2626]/40 hover:text-[#DC2626]" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="editorial" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => openAdd("editorial")}
                  className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Editorial Banner
                </Button>
              </div>
              <AnimatePresence mode="popLayout">
                {editorialBanners.map((banner, index) => (
                  <motion.div
                    key={banner.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white border-0 shadow-sm overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className="w-80 h-48 bg-[#F8F5F2] flex items-center justify-center shrink-0 overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-[#DC2626]/10 to-[#C9A27E]/10 flex items-center justify-center">
                              <Image className="w-12 h-12 text-[#1A1A1A]/15" />
                            </div>
                          </div>
                          <div className="flex-1 p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-[#1A1A1A]">{banner.title}</h3>
                                {!banner.active && (
                                  <Badge className="text-[9px] uppercase tracking-wider bg-[#E8DDD4]/40 text-[#1A1A1A]/40 border-0">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[#1A1A1A]/50 font-light">{banner.subtitle}</p>
                              <p className="text-xs text-[#B8906A] mt-2 font-light flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" />
                                {banner.link}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(banner.id, "up", "editorial")}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#1A1A1A]/30 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(banner.id, "down", "editorial")}
                                  disabled={index === editorialBanners.length - 1}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                                <GripVertical className="w-4 h-4 text-[#1A1A1A]/15" />
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={banner.active}
                                  onCheckedChange={() => toggleActive(banner.id, "editorial")}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEdit(banner, "editorial")}
                                >
                                  <Pencil className="w-4 h-4 text-[#1A1A1A]/40" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => deleteItem(banner.id, "editorial")}
                                >
                                  <Trash2 className="w-4 h-4 text-[#DC2626]/40 hover:text-[#DC2626]" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="announcement" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => openAdd("announcement")}
                  className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Announcement
                </Button>
              </div>
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <Card key={ann.id} className="bg-white border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-48 h-10 rounded flex items-center justify-center text-xs font-light tracking-wide px-3"
                            style={{ backgroundColor: ann.bgColor, color: ann.textColor }}
                          >
                            {ann.text}
                          </div>
                          <div>
                            <p className="text-xs text-[#B8906A] font-light flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {ann.link}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={ann.active}
                            onCheckedChange={() => toggleActive(ann.id, "announcement")}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(ann, "announcement")}
                          >
                            <Pencil className="w-4 h-4 text-[#1A1A1A]/40" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => deleteItem(ann.id, "announcement")}
                          >
                            <Trash2 className="w-4 h-4 text-[#DC2626]/40 hover:text-[#DC2626]" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden border-0 bg-white p-0 sm:max-h-[calc(100dvh-3rem)]">
          <DialogHeader className="shrink-0 border-b border-[#E8DDD4] px-4 py-4 pr-14 sm:px-6 sm:py-5">
            <DialogTitle className="text-lg font-light tracking-wide text-[#1A1A1A]">
              {editingBanner ? "Edit" : "Add"} {dialogType === "hero" ? "Hero Banner" : dialogType === "editorial" ? "Editorial Banner" : "Announcement"}
            </DialogTitle>
            <p className="text-xs text-[#1A1A1A]/50">
              Add the banner content and choose an image for the storefront.
            </p>
            <DialogClose
              type="button"
              aria-label="Close banner form"
              title="Close"
              onClick={() => setDialogOpen(false)}
            />
          </DialogHeader>

          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
            {dialogType === "announcement" ? (
              <>
                <div>
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                    Announcement Text
                  </label>
                  <Input
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    placeholder="Enter announcement text..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                    Link URL
                  </label>
                  <Input
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="/collections/sale"
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                      Background Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.bgColor}
                        onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                        className="w-10 h-10 rounded border-0 cursor-pointer"
                      />
                      <Input
                        value={form.bgColor}
                        onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                        className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.textColor}
                        onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                        className="w-10 h-10 rounded border-0 cursor-pointer"
                      />
                      <Input
                        value={form.textColor}
                        onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                        className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-[#F8F5F2] rounded-sm p-4">
                  <p className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2">
                    Preview
                  </p>
                  <div
                    className="rounded px-4 py-2 text-sm font-light"
                    style={{ backgroundColor: form.bgColor, color: form.textColor }}
                  >
                    {form.text || "Announcement preview..."}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                    Title
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Banner title..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                    Subtitle
                  </label>
                  <Input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="Subtitle text..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                {/* ── Desktop Image ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                      Desktop Image
                    </label>
                    <span className="text-[10px] text-[#C9A27E] bg-[#C9A27E]/10 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                      16:9 · Landscape
                    </span>
                  </div>
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
                      selectImage(event.dataTransfer.files[0]);
                    }}
                    className={cn(
                      "relative flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed bg-[#F8F5F2]/50 p-4 text-center transition-colors",
                      isDraggingImage ? "border-[#C9A27E] bg-[#C9A27E]/10" : "border-[#E8DDD4] hover:border-[#C9A27E]"
                    )}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Desktop banner preview" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/35" />
                        <span className="relative z-10 rounded-sm bg-white/90 px-3 py-2 text-sm text-[#1A1A1A]">
                          Click or drop to replace
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
                      onChange={(event) => selectImage(event.target.files?.[0])}
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
                      className="mt-2 text-xs text-[#1A1A1A]/50 underline hover:text-[#1A1A1A]"
                    >
                      Remove desktop image
                    </button>
                  )}
                  {!imageFile && (
                    <div className="mt-4 rounded-sm border border-[#E8DDD4] bg-white p-3 sm:p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-[#C9A27E]" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1A1A]/50">
                          Or use an image URL
                        </span>
                      </div>
                      <Input
                        value={form.imageUrl}
                        onChange={(e) => {
                          setForm({ ...form, imageUrl: e.target.value });
                          setImagePreview(e.target.value);
                        }}
                        type="url"
                        inputMode="url"
                        aria-label="Desktop Image URL"
                        placeholder="https://example.com/banner-desktop.jpg"
                        className="h-11 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                      />
                      <p className="mt-2 text-xs leading-relaxed text-[#1A1A1A]/40">
                        Use a publicly accessible HTTPS image URL, or upload an image from your device above.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Mobile Image ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                      Mobile Image
                    </label>
                    <span className="text-[10px] text-[#7E9AC9] bg-[#7E9AC9]/10 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                      3:4 · Portrait · Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-[#1A1A1A]/40 mb-3 leading-relaxed">
                    Upload a portrait-cropped version for phones. If omitted, the desktop image is used on mobile.
                  </p>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => mobileImageInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") mobileImageInputRef.current?.click();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingMobile(true);
                    }}
                    onDragLeave={() => setIsDraggingMobile(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDraggingMobile(false);
                      selectMobileImage(event.dataTransfer.files[0]);
                    }}
                    className={cn(
                      "relative flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed bg-[#F8F5F2]/50 p-4 text-center transition-colors",
                      isDraggingMobile ? "border-[#7E9AC9] bg-[#7E9AC9]/10" : "border-[#E8DDD4] hover:border-[#7E9AC9]"
                    )}
                  >
                    {mobileImagePreview ? (
                      <>
                        <img src={mobileImagePreview} alt="Mobile banner preview" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/35" />
                        <span className="relative z-10 rounded-sm bg-white/90 px-3 py-2 text-sm text-[#1A1A1A]">
                          Click or drop to replace
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="mb-2 h-6 w-6 text-[#1A1A1A]/30" />
                        <span className="text-sm text-[#1A1A1A]/50">Upload mobile image</span>
                        <span className="mt-1 text-xs text-[#1A1A1A]/30">PNG, JPG, WebP up to 10MB</span>
                      </>
                    )}
                    <input
                      ref={mobileImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={(event) => selectMobileImage(event.target.files?.[0])}
                    />
                  </div>
                  {mobileImagePreview && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMobileImageFile(null);
                        setMobileImagePreview("");
                        setForm((current) => ({ ...current, mobileImageUrl: "" }));
                        if (mobileImageInputRef.current) mobileImageInputRef.current.value = "";
                      }}
                      className="mt-2 text-xs text-[#1A1A1A]/50 underline hover:text-[#1A1A1A]"
                    >
                      Remove mobile image
                    </button>
                  )}
                  {!mobileImageFile && (
                    <div className="mt-4 rounded-sm border border-[#E8DDD4] bg-white p-3 sm:p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-[#7E9AC9]" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1A1A]/50">
                          Or use a mobile image URL
                        </span>
                      </div>
                      <Input
                        value={form.mobileImageUrl}
                        onChange={(e) => {
                          setForm({ ...form, mobileImageUrl: e.target.value });
                          setMobileImagePreview(e.target.value);
                        }}
                        type="url"
                        inputMode="url"
                        aria-label="Mobile Image URL"
                        placeholder="https://example.com/banner-mobile.jpg"
                        className="h-11 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                    Link URL
                  </label>
                  <Input
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="/collections/..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                {dialogType === "hero" && (
                  <div>
                    <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                      Button Text
                    </label>
                    <Input
                      value={form.buttonText}
                      onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                      placeholder="Shop Now"
                      className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                    Active
                  </label>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                  />
                </div>
              </>
            )}
            <div className="flex flex-col-reverse gap-3 border-t border-[#E8DDD4] pt-5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="w-full border-[#E8DDD4] text-[#1A1A1A]/60 font-light sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="w-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide sm:w-auto"
              >
                {editingBanner ? "Save Changes" : "Add Banner"}
              </Button>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
