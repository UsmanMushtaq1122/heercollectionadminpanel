"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Save,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { settingsSchema } from "@/lib/validations";
import { useToast } from "@/components/ui/toast";
import type { SiteSettings } from "@/types";
import { adminSettingsService } from "@/lib/admin-services";

type SettingsForm = {
  brandName: string;
  brandDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxRate?: number;
  instagramHandle?: string;
  marqueeText?: string;
  returnWindowDays: number;
  exchangeWindowDays: number;
};

function mapSettings(s: SiteSettings): SettingsForm {
  return {
    brandName: s.brandName ?? "",
    brandDescription: s.brandDescription ?? "",
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    address: s.address ?? "",
    taxRate: s.taxRate,
    instagramHandle: s.instagramHandle,
    marqueeText: s.marqueeText,
    returnWindowDays: s.returnWindowDays ?? 7,
    exchangeWindowDays: s.exchangeWindowDays ?? 7,
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast("error", "Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (type === "logo") {
          setLogoPreview(result);
        } else {
          setFaviconPreview(result);
        }
        toast("success", `${type === "logo" ? "Logo" : "Favicon"} uploaded`);
      };
      reader.readAsDataURL(file);

      e.target.value = "";
    },
    [toast]
  );

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => adminSettingsService.getGeneral(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: settings ? mapSettings(settings) : undefined,
  });

  useEffect(() => {
    if (settings) reset(mapSettings(settings));
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: SettingsForm) => adminSettingsService.updateGeneral(data),
    onSuccess: () => {
      toast("success", "Settings saved successfully");
    },
    onError: () => {
      toast("error", "Failed to save settings");
    },
  });

  const onSubmit = (data: SettingsForm) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          Settings
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="users">Admin Users</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Information</CardTitle>
                  <CardDescription>
                    Manage your brand identity and visual assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Input
                    label="Brand Name"
                    {...register("brandName")}
                    error={errors.brandName?.message}
                  />
                  <Textarea
                    label="Brand Description"
                    {...register("brandDescription")}
                    error={errors.brandDescription?.message}
                    rows={4}
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                        Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-sm border-2 border-dashed border-[#1A1A1A]/10 bg-[#F8F5F2]/50 transition-colors hover:border-[#C9A27E]/50 cursor-pointer relative group"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {logoPreview ? (
                            <>
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="h-full w-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogoPreview(null);
                                }}
                                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="h-8 w-8 text-[#1A1A1A]/30" />
                          )}
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, "logo")}
                        />
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            {logoPreview ? "Change Logo" : "Upload Logo"}
                          </Button>
                          <p className="text-xs text-[#1A1A1A]/40">
                            Recommended: 200x200px, PNG or SVG
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                        Favicon
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-sm border-2 border-dashed border-[#1A1A1A]/10 bg-[#F8F5F2]/50 transition-colors hover:border-[#C9A27E]/50 cursor-pointer relative group"
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          {faviconPreview ? (
                            <>
                              <img
                                src={faviconPreview}
                                alt="Favicon preview"
                                className="h-full w-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFaviconPreview(null);
                                }}
                                className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="h-5 w-5 text-[#1A1A1A]/30" />
                          )}
                        </div>
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/png,image/x-icon,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, "favicon")}
                        />
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => faviconInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            {faviconPreview ? "Change Favicon" : "Upload Favicon"}
                          </Button>
                          <p className="text-xs text-[#1A1A1A]/40">
                            Recommended: 32x32px, ICO or PNG
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                  <CardDescription>
                    How customers can reach you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Input
                      label="Email"
                      type="email"
                      {...register("contactEmail")}
                      error={errors.contactEmail?.message}
                    />
                    <Input
                      label="Phone"
                      {...register("contactPhone")}
                      error={errors.contactPhone?.message}
                    />
                  </div>
                  <Textarea
                    label="Address"
                    {...register("address")}
                    error={errors.address?.message}
                    rows={3}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Instagram Storefront Feed</CardTitle>
                  <CardDescription>
                    Configure the Instagram account used by the storefront feed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    label="Instagram Account Handle"
                    placeholder="@heercollection"
                    {...register("instagramHandle")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storefront Marquee Bar</CardTitle>
                  <CardDescription>
                    Configure the scrolling announcement ticker on the homepage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    label="Marquee Ticker Text"
                    placeholder="Enter ticker text separated by bullet points..."
                    rows={2}
                    {...register("marqueeText")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Rules</CardTitle>
                  <CardDescription>
                    Configure return and exchange policies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Input
                      label="Tax Rate (%)"
                      type="number"
                      placeholder="5"
                      {...register("taxRate", { valueAsNumber: true })}
                    />
                    <Input
                      label="Return Window (Days)"
                      type="number"
                      {...register("returnWindowDays", { valueAsNumber: true })}
                      error={errors.returnWindowDays?.message}
                    />
                    <Input
                      label="Exchange Window (Days)"
                      type="number"
                      {...register("exchangeWindowDays", { valueAsNumber: true })}
                      error={errors.exchangeWindowDays?.message}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={saveMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="shipping">
            <div className="py-8 text-center text-sm text-[#1A1A1A]/50">
              Navigate to{" "}
              <a href="/admin/settings/shipping" className="text-[#B8906A] hover:underline">
                Shipping Settings
              </a>{" "}
              to manage shipping configuration.
            </div>
          </TabsContent>

          <TabsContent value="seo">
            <div className="py-8 text-center text-sm text-[#1A1A1A]/50">
              Navigate to{" "}
              <a href="/admin/settings/seo" className="text-[#B8906A] hover:underline">
                SEO Settings
              </a>{" "}
              to manage search engine optimization defaults.
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="py-8 text-center text-sm text-[#1A1A1A]/50">
              Navigate to{" "}
              <a href="/admin/settings/users" className="text-[#B8906A] hover:underline">
                Admin Users
              </a>{" "}
              to manage team access and permissions.
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
