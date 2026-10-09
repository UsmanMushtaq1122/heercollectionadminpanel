"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Ticket,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Coupon } from "@/types";
import { adminCouponService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

const couponFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(0, "Value is required"),
  minOrderAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  usageLimit: z.number().optional(),
  expiresAt: z.string().optional(),
});

type CouponFormData = z.infer<typeof couponFormSchema>;

const defaultFormValues: CouponFormData = {
  code: "",
  description: "",
  type: "percentage",
  value: 0,
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  usageLimit: 0,
  expiresAt: "",
};

export default function CouponsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => adminCouponService.list(),
  });
  const createMutation = useMutation({
    mutationFn: (data: Partial<Coupon>) => adminCouponService.create(data),
    onSuccess: () => {
      toast("success", "Coupon created successfully");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) =>
      adminCouponService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCouponService.remove(id),
    onSuccess: () => {
      toast("success", "Coupon deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchType = watch("type");

  const openCreate = () => {
    setEditingId(null);
    reset(defaultFormValues);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    reset({
      code: coupon.code,
      description: coupon.description || "",
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      usageLimit: coupon.usageLimit || 0,
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().split("T")[0]
        : "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CouponFormData) => {
    const payload: Partial<Coupon> = {
      code: data.code.toUpperCase().trim(),
      description: data.description,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount || undefined,
      maxDiscountAmount: data.maxDiscountAmount || undefined,
      usageLimit: data.usageLimit || undefined,
      expiresAt: data.expiresAt
        ? new Date(data.expiresAt).toISOString()
        : undefined,
    };
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => toast("success", "Coupon updated successfully") }
      );
    } else {
      createMutation.mutate(payload);
    }
    setDialogOpen(false);
    reset(defaultFormValues);
  };

  const toggleActive = (id: string) => {
    const coupon = coupons.find((c) => c.id === id);
    if (!coupon) return;
    updateMutation.mutate({ id, data: { isActive: !coupon.isActive } });
  };

  const deleteCoupon = (id: string) => {
    deleteMutation.mutate(id);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            Coupons
          </h1>
          <p className="mt-1 text-sm text-[#1A1A1A]/50">
            {coupons.length} total coupons &middot;{" "}
            {coupons.filter((c) => c.isActive).length} active
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="rounded-sm border border-[#1A1A1A]/10 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => {
                const expired = isExpired(coupon.expiresAt);
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded-sm bg-[#1A1A1A] px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#C9A27E]">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          className="rounded-sm p-1 text-[#1A1A1A]/40 transition-colors hover:bg-[#E8DDD4]/50 hover:text-[#1A1A1A]"
                        >
                          {copiedId === coupon.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={coupon.type === "percentage" ? "default" : "outline"}
                      >
                        {coupon.type === "percentage" ? "%" : "PKR"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {coupon.type === "percentage"
                        ? `${coupon.value}%`
                        : formatCurrency(coupon.value)}
                    </TableCell>
                    <TableCell className="text-[#1A1A1A]/50">
                      {coupon.minOrderAmount
                        ? formatCurrency(coupon.minOrderAmount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        <span className="font-medium">{coupon.usedCount}</span>
                        <span className="text-[#1A1A1A]/40">
                          {" / "}
                          {coupon.usageLimit || "∞"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {coupon.expiresAt ? (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            expired ? "text-red-500" : "text-[#1A1A1A]/60"
                          )}
                        >
                          {formatDate(coupon.expiresAt)}
                          {expired && (
                            <span className="ml-1 text-[10px] font-bold uppercase text-red-400">
                              Expired
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-[#1A1A1A]/40">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={coupon.isActive}
                        onCheckedChange={() => toggleActive(coupon.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-sm p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#E8DDD4]/50 hover:text-[#1A1A1A]">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(coupon)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyCode(coupon.code, coupon.id)}>
                            <Copy className="h-4 w-4" />
                            Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onClick={() => deleteCoupon(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>
            {editingId ? "Edit Coupon" : "Create Coupon"}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? "Update the coupon details below."
              : "Fill in the details to create a new coupon."}
          </DialogDescription>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <Input
              label="Coupon Code"
              placeholder="e.g. SUMMER25"
              {...register("code")}
              error={errors.code?.message}
              className="font-mono tracking-wider uppercase"
            />
            <Textarea
              label="Description"
              placeholder="Describe this coupon..."
              {...register("description")}
              className="min-h-[60px]"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Type" {...register("type")}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (PKR)</option>
              </Select>
              <Input
                label="Value"
                type="number"
                placeholder="0"
                {...register("value", { valueAsNumber: true })}
                error={errors.value?.message}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Min Order Amount"
                type="number"
                placeholder="0"
                {...register("minOrderAmount", { valueAsNumber: true })}
                error={errors.minOrderAmount?.message}
              />
              {watchType === "percentage" && (
                <Input
                  label="Max Discount Amount"
                  type="number"
                  placeholder="0"
                  {...register("maxDiscountAmount", { valueAsNumber: true })}
                  error={errors.maxDiscountAmount?.message}
                />
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Usage Limit"
                type="number"
                placeholder="Unlimited"
                {...register("usageLimit", { valueAsNumber: true })}
                error={errors.usageLimit?.message}
              />
              <Input
                label="Expiry Date"
                type="date"
                {...register("expiresAt")}
                error={errors.expiresAt?.message}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  reset(defaultFormValues);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Update Coupon" : "Create Coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
