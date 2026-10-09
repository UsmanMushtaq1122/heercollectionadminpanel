"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Search, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { seoSettingsSchema } from "@/lib/validations";
import { useToast } from "@/components/ui/toast";
import { adminSettingsService } from "@/lib/admin-services";

type SEOForm = {
  metaTitle: string;
  metaDescription: string;
  baseUrl: string;
  canonicalUrl: boolean;
};

export default function SEOSettingsPage() {
  const { toast } = useToast();

  const { data: seo } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: () => adminSettingsService.getSEO(),
  });

  const [titleCharCount, setTitleCharCount] = useState(
    seo?.metaTitle.length ?? 0
  );
  const [descCharCount, setDescCharCount] = useState(
    seo?.metaDescription.length ?? 0
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SEOForm>({
    resolver: zodResolver(seoSettingsSchema) as any,
    defaultValues: {
      metaTitle: seo?.metaTitle ?? "",
      metaDescription: seo?.metaDescription ?? "",
      baseUrl: "https://heercollection.com",
      canonicalUrl: true,
    },
  });

  useEffect(() => {
    if (seo) {
      reset({
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        baseUrl: "https://heercollection.com",
        canonicalUrl: true,
      });
      setTitleCharCount(seo.metaTitle.length);
      setDescCharCount(seo.metaDescription.length);
    }
  }, [seo, reset]);

  const metaTitle = watch("metaTitle");
  const metaDescription = watch("metaDescription");
  const baseUrl = watch("baseUrl");

  const saveMutation = useMutation({
    mutationFn: (data: SEOForm) =>
      adminSettingsService.updateSEO({
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      }),
    onSuccess: () => {
      toast("success", "SEO settings saved successfully");
    },
    onError: () => {
      toast("error", "Failed to save SEO settings");
    },
  });

  const onSubmit = (data: SEOForm) => {
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
          SEO Defaults
        </h1>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#C9A27E]/10">
                  <Search className="h-5 w-5 text-[#B8906A]" />
                </div>
                <div>
                  <CardTitle>Default Meta Tags</CardTitle>
                  <CardDescription>
                    Set the default SEO meta information for your store pages
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Input
                  label="Meta Title"
                  {...register("metaTitle")}
                  error={errors.metaTitle?.message}
                  onChange={(e) => {
                    register("metaTitle").onChange(e);
                    setTitleCharCount(e.target.value.length);
                  }}
                />
                <div className="mt-1.5 flex justify-between">
                  <p className="text-xs text-[#1A1A1A]/40">
                    Appears in search engine results and browser tabs
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      titleCharCount > 60 ? "text-red-500" : "text-[#1A1A1A]/40"
                    }`}
                  >
                    {titleCharCount}/60
                  </span>
                </div>
              </div>
              <div>
                <Textarea
                  label="Meta Description"
                  rows={3}
                  {...register("metaDescription")}
                  error={errors.metaDescription?.message}
                  onChange={(e) => {
                    register("metaDescription").onChange(e);
                    setDescCharCount(e.target.value.length);
                  }}
                />
                <div className="mt-1.5 flex justify-between">
                  <p className="text-xs text-[#1A1A1A]/40">
                    Summary shown below the title in search results
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      descCharCount > 160 ? "text-red-500" : "text-[#1A1A1A]/40"
                    }`}
                  >
                    {descCharCount}/160
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#1A1A1A]">
                  Search Preview
                </p>
                <div className="rounded-sm border border-[#1A1A1A]/10 bg-white p-5">
                  <div className="flex items-center gap-2 text-xs text-[#1A1A1A]/50">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{baseUrl}</span>
                  </div>
                  <p className="mt-1.5 text-lg font-medium text-blue-700">
                    {metaTitle || "Page Title"}
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    {baseUrl}
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]/60">
                    {metaDescription ||
                      "A brief description of your page content appears here..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#C9A27E]/10">
                  <Globe className="h-5 w-5 text-[#B8906A]" />
                </div>
                <div>
                  <CardTitle>URL Settings</CardTitle>
                  <CardDescription>
                    Configure URL structure and canonical preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                label="Base URL"
                {...register("baseUrl")}
                error={errors.baseUrl?.message}
              />
              <div className="flex items-center justify-between rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/30 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-[#1A1A1A]/40" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      Canonical URL
                    </p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      Prevent duplicate content issues in search engines
                    </p>
                  </div>
                </div>
                <Switch
                  checked={watch("canonicalUrl")}
                  onCheckedChange={(checked) => setValue("canonicalUrl", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex justify-end">
          <Button type="submit" loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
