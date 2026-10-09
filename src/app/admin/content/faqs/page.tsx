"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  GripVertical,
  HelpCircle,
  Search,
  Filter,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { FAQ as FAQDTO } from "@/types";
import { adminFaqService } from "@/lib/admin-services";
import { getErrorMessage } from "@/lib/api";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
  order: number;
}

function mapFAQ(f: FAQDTO): FAQ {
  return { id: f.id, question: f.question, answer: f.answer, category: f.category, active: f.isActive, order: f.sortOrder };
}

const categoryConfig: Record<string, string> = {
  Shipping: "bg-blue-50 text-blue-600 border-blue-200",
  Returns: "bg-amber-50 text-amber-700 border-amber-200",
  Sizing: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Orders: "bg-[#C9A27E]/10 text-[#B8906A] border-[#C9A27E]/20",
};

export default function FAQsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rawFaqs = [] } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => adminFaqService.list(),
  });
  const faqs = rawFaqs.map(mapFAQ);
  const createMutation = useMutation({
    mutationFn: (data: Partial<FAQDTO>) => adminFaqService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast("success", "FAQ created successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FAQDTO> }) => adminFaqService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminFaqService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast("success", "FAQ deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQ | null>(null);
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "Shipping",
    active: true,
  });

  const categories = [...new Set(faqs.map((f) => f.category))];

  const filtered = faqs.filter((faq) => {
    const matchesCategory = filterCategory === "all" || faq.category === filterCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedFAQs = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter((f) => f.category === cat);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const openAdd = () => {
    setEditingItem(null);
    setForm({ question: "", answer: "", category: "Shipping", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: FAQ) => {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: Partial<FAQDTO> = {
      question: form.question,
      answer: form.answer,
      category: form.category,
      isActive: form.active,
      sortOrder: editingItem ? editingItem.order : faqs.length,
    };
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: payload },
        { onSuccess: () => toast("success", "FAQ updated successfully") }
      );
    } else {
      createMutation.mutate(payload);
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => {
    const item = faqs.find((f) => f.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.active } });
    }
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const idx = faqs.findIndex((f) => f.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= faqs.length) return;
    const current = faqs[idx];
    const target = faqs[newIdx];
    updateMutation.mutate({ id: current.id, data: { sortOrder: target.order } });
    updateMutation.mutate({ id: target.id, data: { sortOrder: current.order } });
  };

  const deleteItem = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1000px] min-w-0 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">FAQs</h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">{faqs.length} frequently asked questions</p>
            </div>
            <Button onClick={openAdd} className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide">
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                className={cn(
                  "font-light text-xs uppercase tracking-wide",
                  filterCategory === "all"
                    ? "bg-[#1A1A1A] text-white"
                    : "border-[#E8DDD4] text-[#1A1A1A]/60"
                )}
                onClick={() => setFilterCategory("all")}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  className={cn(
                    "font-light text-xs uppercase tracking-wide",
                    filterCategory === cat
                      ? "bg-[#1A1A1A] text-white"
                      : "border-[#E8DDD4] text-[#1A1A1A]/60"
                  )}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {Object.entries(groupedFAQs).map(([category, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-medium text-[#1A1A1A] uppercase tracking-widest">
                      {category}
                    </h2>
                    <Badge className={cn("text-[9px] uppercase tracking-wider font-medium border", categoryConfig[category] || "bg-[#E8DDD4]/40 text-[#1A1A1A]/50 border-[#E8DDD4]")}>
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="bg-white border-0 shadow-sm">
                          <CardContent className="p-0">
                            <div className="w-full p-4 flex items-center gap-4 hover:bg-[#F8F5F2]/30 transition-colors rounded-sm">
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-[#1A1A1A]/20 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(faq.id, "up")}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-[#1A1A1A]/20 hover:text-[#1A1A1A]"
                                  onClick={() => moveItem(faq.id, "down")}
                                  disabled={index === items.length - 1}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <button
                                type="button"
                                className="flex-1 min-w-0 flex items-center justify-between text-left gap-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={cn("font-medium text-sm", faq.active ? "text-[#1A1A1A]" : "text-[#1A1A1A]/40")}>
                                      {faq.question}
                                    </p>
                                    {!faq.active && (
                                      <Badge className="text-[8px] uppercase tracking-wider bg-[#E8DDD4]/40 text-[#1A1A1A]/40 border-0 shrink-0">
                                        Draft
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight
                                  className={cn(
                                    "w-4 h-4 text-[#1A1A1A]/20 transition-transform shrink-0",
                                    expandedId === faq.id && "rotate-90"
                                  )}
                                />
                              </button>
                            </div>
                            <AnimatePresence>
                              {expandedId === faq.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 pl-14">
                                    <Separator className="bg-[#E8DDD4]/40 mb-3" />
                                    <p className="text-sm text-[#1A1A1A]/50 font-light leading-relaxed mb-4">
                                      {faq.answer}
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <Switch
                                        checked={faq.active}
                                        onCheckedChange={() => toggleActive(faq.id)}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-3 text-xs font-light"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEdit(faq);
                                        }}
                                      >
                                        <Pencil className="w-3 h-3 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-3 text-xs font-light text-[#DC2626]/50 hover:text-[#DC2626]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteItem(faq.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-0 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-light tracking-wide text-[#1A1A1A]">
              {editingItem ? "Edit" : "Add"} FAQ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Question</label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Enter the question..."
                className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Answer</label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Enter the answer..."
                className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light min-h-[120px] focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Category</label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                <SelectTrigger className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">Active</label>
              <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E8DDD4] text-[#1A1A1A]/60 font-light">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide">
                {editingItem ? "Save Changes" : "Add FAQ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
