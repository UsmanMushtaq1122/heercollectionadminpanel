"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  Search,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTime } from "@/lib/utils";
import { CMSPage as CMSPageDTO } from "@/types";
import { adminPageService } from "@/lib/admin-services";
import { getErrorMessage } from "@/lib/api";

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  lastUpdated: string;
  metaTitle: string;
  metaDescription: string;
}

function mapPage(p: CMSPageDTO): CMSPage {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    published: p.isPublished,
    lastUpdated: p.updatedAt,
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
  };
}

export default function PagesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rawPages = [] } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: () => adminPageService.list(),
  });
  const pages = rawPages.map(mapPage);
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CMSPageDTO> }) => adminPageService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms-pages"] }),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    published: false,
  });

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEdit = (page: CMSPage) => {
    setEditingPage(page);
    setForm({
      title: page.title,
      slug: page.slug,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      published: page.published,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingPage) {
      updateMutation.mutate(
        {
          id: editingPage.id,
          data: {
            title: form.title,
            slug: form.slug,
            content: form.content,
            metaTitle: form.metaTitle || undefined,
            metaDescription: form.metaDescription || undefined,
            isPublished: form.published,
          },
        },
        { onSuccess: () => toast("success", "Page updated successfully") }
      );
    }
    setDialogOpen(false);
  };

  const togglePublished = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) {
      updateMutation.mutate({ id, data: { isPublished: !page.published } });
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1000px] min-w-0 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">CMS Pages</h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">{pages.length} pages</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DDD4] bg-white font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-sm bg-[#F8F5F2] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[#1A1A1A]/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium text-[#1A1A1A] text-sm">{page.title}</h3>
                            <Badge
                              className={cn(
                                "text-[9px] uppercase tracking-wider font-medium border",
                                page.published
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : "bg-[#E8DDD4]/40 text-[#1A1A1A]/40 border-[#E8DDD4]"
                              )}
                            >
                              {page.published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#1A1A1A]/35 font-light">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              /{page.slug}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(page.lastUpdated)}
                            </span>
                          </div>
                          <p className="text-xs text-[#1A1A1A]/30 font-light mt-1 line-clamp-1">
                            {page.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Switch
                          checked={page.published}
                          onCheckedChange={() => togglePublished(page.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs font-light gap-1.5"
                          onClick={() => openEdit(page)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-light tracking-wide text-[#1A1A1A]">
              Edit Page
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm({ ...form, title, slug: generateSlug(title) });
                  }}
                  placeholder="Page title..."
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Slug</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="page-slug"
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light font-mono text-sm focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">
                Content
              </label>
              <div className="border border-[#E8DDD4] rounded-sm bg-[#F8F5F2]/50 overflow-hidden">
                <div className="flex items-center gap-1 px-3 py-2 border-b border-[#E8DDD4] bg-white">
                  {["B", "I", "U", "H1", "H2", "Link", "List"].map((btn) => (
                    <Button
                      key={btn}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs font-light text-[#1A1A1A]/40"
                    >
                      {btn}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Page content... (Rich text editor coming soon)"
                  className="border-0 bg-transparent font-light min-h-[200px] focus:ring-0 resize-none"
                />
              </div>
              <p className="text-[10px] text-[#1A1A1A]/25 mt-1 font-light">
                Tipap rich text editor integration coming in the next update
              </p>
            </div>

            <Separator className="bg-[#E8DDD4]/40" />

            <div>
              <h4 className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-3">
                SEO Settings
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#1A1A1A]/40 font-light mb-1.5 block">Meta Title</label>
                  <Input
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    placeholder="SEO title..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                  <p className="text-[10px] text-[#1A1A1A]/25 mt-1 font-light">
                    {form.metaTitle.length}/60 characters
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#1A1A1A]/40 font-light mb-1.5 block">Meta Description</label>
                  <Textarea
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    placeholder="SEO description..."
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light min-h-[80px] focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                  <p className="text-[10px] text-[#1A1A1A]/25 mt-1 font-light">
                    {form.metaDescription.length}/160 characters
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">Published</label>
              <Switch checked={form.published} onCheckedChange={(checked) => setForm({ ...form, published: checked })} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E8DDD4] text-[#1A1A1A]/60 font-light">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide">
                Save Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
