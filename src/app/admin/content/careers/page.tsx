"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  MapPin,
  Briefcase,
  DollarSign,
  PlusCircle,
  MinusCircle,
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Career as CareerDTO } from "@/types";
import { adminCareerService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

interface Career {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship";
  description: string;
  requirements: string[];
  salary: string;
  active: boolean;
}

function mapCareer(c: CareerDTO): Career {
  return {
    id: c.id,
    title: c.title,
    department: c.department,
    location: c.location,
    type: c.type.replace("_", "-") as Career["type"],
    description: c.description,
    requirements: c.requirements,
    salary: c.salary || "",
    active: c.isActive,
  };
}

const typeConfig: Record<string, { label: string; color: string }> = {
  "full-time": { label: "Full-Time", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  "part-time": { label: "Part-Time", color: "bg-blue-50 text-blue-600 border-blue-200" },
  contract: { label: "Contract", color: "bg-amber-50 text-amber-700 border-amber-200" },
  internship: { label: "Internship", color: "bg-purple-50 text-purple-600 border-purple-200" },
};

const departmentColors: Record<string, string> = {
  Design: "bg-[#C9A27E]/10 text-[#B8906A] border-[#C9A27E]/20",
  Digital: "bg-blue-50 text-blue-600 border-blue-200",
  Marketing: "bg-pink-50 text-pink-600 border-pink-200",
  Operations: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Creative: "bg-purple-50 text-purple-600 border-purple-200",
};

export default function CareersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rawCareers = [] } = useQuery({
    queryKey: ["careers"],
    queryFn: () => adminCareerService.list(),
  });
  const careers = rawCareers.map(mapCareer);
  const createMutation = useMutation({
    mutationFn: (data: Partial<CareerDTO>) => adminCareerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers"] });
      toast("success", "Career created successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CareerDTO> }) => adminCareerService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["careers"] }),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCareerService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers"] });
      toast("success", "Career deleted successfully");
    },
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    type: "full-time" as Career["type"],
    description: "",
    requirements: [""],
    salary: "",
    active: true,
  });

  const openAdd = () => {
    setEditingCareer(null);
    setForm({
      title: "",
      department: "",
      location: "",
      type: "full-time",
      description: "",
      requirements: [""],
      salary: "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (career: Career) => {
    setEditingCareer(career);
    setForm({
      title: career.title,
      department: career.department,
      location: career.location,
      type: career.type,
      description: career.description,
      requirements: [...career.requirements],
      salary: career.salary,
      active: career.active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const filteredReqs = form.requirements.filter((r) => r.trim() !== "");
    const payload: Partial<CareerDTO> = {
      title: form.title,
      department: form.department,
      location: form.location,
      type: form.type.replace("-", "_") as CareerDTO["type"],
      description: form.description,
      requirements: filteredReqs,
      salary: form.salary || undefined,
      isActive: form.active,
    };
    if (editingCareer) {
      updateMutation.mutate(
        { id: editingCareer.id, data: payload },
        { onSuccess: () => toast("success", "Career updated successfully") }
      );
    } else {
      createMutation.mutate(payload);
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => {
    const item = careers.find((c) => c.id === id);
    if (item) {
      updateMutation.mutate({ id, data: { isActive: !item.active } });
    }
  };

  const deleteItem = (id: string) => {
    deleteMutation.mutate(id);
  };

  const addRequirement = () => {
    setForm({ ...form, requirements: [...form.requirements, ""] });
  };

  const removeRequirement = (index: number) => {
    if (form.requirements.length > 1) {
      setForm({
        ...form,
        requirements: form.requirements.filter((_, i) => i !== index),
      });
    }
  };

  const updateRequirement = (index: number, value: string) => {
    const updated = [...form.requirements];
    updated[index] = value;
    setForm({ ...form, requirements: updated });
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1000px] min-w-0 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">Careers</h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">
                {careers.length} open positions
              </p>
            </div>
            <Button onClick={openAdd} className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80 font-light tracking-wide">
              <Plus className="w-4 h-4 mr-2" />
              Add Position
            </Button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {careers.map((career, index) => {
                const config = typeConfig[career.type];
                const isExpanded = expandedId === career.id;
                return (
                  <motion.div
                    key={career.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white border-0 shadow-sm">
                      <CardContent className="p-0">
                        <button
                          className="w-full text-left p-5"
                          onClick={() => setExpandedId(isExpanded ? null : career.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className={cn("font-medium", career.active ? "text-[#1A1A1A]" : "text-[#1A1A1A]/40")}>
                                  {career.title}
                                </h3>
                                <Badge className={cn("text-[9px] uppercase tracking-wider font-medium border", config.color)}>
                                  {config.label}
                                </Badge>
                                {!career.active && (
                                  <Badge className="text-[9px] uppercase tracking-wider bg-[#E8DDD4]/40 text-[#1A1A1A]/40 border-0">
                                    Closed
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-[#1A1A1A]/40 font-light mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {career.department}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {career.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {career.salary}
                                </span>
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "w-5 h-5 text-[#1A1A1A]/20 transition-transform shrink-0 ml-4",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5">
                                <Separator className="bg-[#E8DDD4]/40 mb-4" />
                                <p className="text-sm text-[#1A1A1A]/60 font-light leading-relaxed mb-4">
                                  {career.description}
                                </p>
                                <div className="mb-4">
                                  <h4 className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2">
                                    Requirements
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {career.requirements.map((req, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A1A]/50 font-light">
                                        <span className="w-1 h-1 rounded-full bg-[#C9A27E] mt-2 shrink-0" />
                                        {req}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="flex items-center gap-3 pt-3 border-t border-[#1A1A1A]/5">
                                  <Switch
                                    checked={career.active}
                                    onCheckedChange={() => toggleActive(career.id)}
                                  />
                                  <span className="text-xs text-[#1A1A1A]/40 font-light">
                                    {career.active ? "Accepting Applications" : "Position Closed"}
                                  </span>
                                  <div className="flex-1" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-light gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(career);
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-light text-[#DC2626]/50 hover:text-[#DC2626] gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteItem(career.id);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-light tracking-wide text-[#1A1A1A]">
              {editingCareer ? "Edit" : "Add"} Position
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Position title..."
                className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Department</label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Design, Marketing..."
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Lahore, Karachi..."
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Type</label>
                <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val as Career["type"] })}>
                  <SelectTrigger className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="part-time">Part-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Salary Range</label>
                <Input
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="PKR 100,000 - 150,000 / month"
                  className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Job description..."
                className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light min-h-[100px] focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">Requirements</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-light text-[#B8906A] hover:text-[#B8906A]/80 gap-1"
                  onClick={addRequirement}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={req}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      placeholder={`Requirement ${index + 1}...`}
                      className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light text-sm focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => removeRequirement(index)}
                      disabled={form.requirements.length <= 1}
                    >
                      <MinusCircle className="w-4 h-4 text-[#DC2626]/30 hover:text-[#DC2626]" />
                    </Button>
                  </div>
                ))}
              </div>
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
                {editingCareer ? "Save Changes" : "Add Position"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
