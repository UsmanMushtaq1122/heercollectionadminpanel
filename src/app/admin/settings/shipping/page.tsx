"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Truck, CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { shippingSchema } from "@/lib/validations";
import { useToast } from "@/components/ui/toast";
import { adminSettingsService } from "@/lib/admin-services";

type ShippingForm = {
  shippingCost: number;
  expressShippingCost: number;
  freeShippingThreshold: number;
  codFee: number;
  codEnabled: boolean;
  advancedShippingEnabled: boolean;
  additionalShippingChargeEnabled: boolean;
  additionalShippingCharge: number;
  expressAdditionalChargeEnabled: boolean;
  expressAdditionalCharge: number;
  perItemChargeEnabled: boolean;
  perItemCharge: number;
  perKgChargeEnabled: boolean;
  perKgCharge: number;
};

export default function ShippingSettingsPage() {
  const { toast } = useToast();

  const { data: shipping } = useQuery({
    queryKey: ["shipping-settings"],
    queryFn: () => adminSettingsService.getShipping(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema) as any,
    defaultValues: shipping as ShippingForm | undefined,
  });

  useEffect(() => {
    if (shipping) reset(shipping as ShippingForm);
  }, [shipping, reset]);

  const codEnabled = watch("codEnabled");
  const advancedShippingEnabled = watch("advancedShippingEnabled");

  const numericField = (name: keyof Pick<
    ShippingForm,
    | "shippingCost"
    | "expressShippingCost"
    | "freeShippingThreshold"
    | "additionalShippingCharge"
    | "expressAdditionalCharge"
    | "perItemCharge"
    | "perKgCharge"
    | "codFee"
  >) => ({
    ...register(name, {
      setValueAs: (value: string) =>
        value === ""
          ? name === "shippingCost" || name === "expressShippingCost" ? Number.NaN : 0
          : Number(value),
    }),
    type: "number" as const,
    min: 0,
    step: "0.01",
    inputMode: "decimal" as const,
  });

  const saveMutation = useMutation({
    mutationFn: (data: ShippingForm) => adminSettingsService.updateShipping(data),
    onSuccess: (_response, data) => {
      reset(data);
      toast("success", "Shipping settings saved successfully");
    },
    onError: (error) => {
      toast("error", error instanceof Error ? error.message : "Failed to save shipping settings");
    },
  });

  const onSubmit = (data: ShippingForm) => {
    saveMutation.mutate(data);
  };

  const onInvalidSubmit = (invalidFields: typeof errors) => {
    const firstError = Object.values(invalidFields).find((error) => error?.message)?.message;
    toast("error", firstError || "Please correct the highlighted shipping settings.");
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
          Shipping Settings
        </h1>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#C9A27E]/10">
                  <Truck className="h-5 w-5 text-[#B8906A]" />
                </div>
                <div>
                  <CardTitle>Shipping Rates</CardTitle>
                  <CardDescription>
                    Configure standard and express delivery pricing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Basic Shipping</h3>
                <p className="mt-1 text-xs text-[#1A1A1A]/50">
                  Base rates used before any advanced charges are applied.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Standard Shipping (PKR)"
                  {...numericField("shippingCost")}
                  error={errors.shippingCost?.message}
                />
                <Input
                  label="Express Shipping (PKR)"
                  {...numericField("expressShippingCost")}
                  error={errors.expressShippingCost?.message}
                />
              </div>
              <div>
                <Input
                  label="Free Shipping Threshold (PKR)"
                  {...numericField("freeShippingThreshold")}
                  error={errors.freeShippingThreshold?.message}
                />
                <p className="mt-1.5 text-xs text-[#1A1A1A]/40">
                  Orders at or above this amount qualify for free standard shipping. Set to 0 to disable.
                </p>
              </div>

              <div className="border-t border-[#1A1A1A]/10 pt-5">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Advanced Shipping Charges</h3>
                <p className="mt-1 text-xs text-[#1A1A1A]/50">
                  Optional surcharges are added to the base rate. Per-item charges multiply by quantity; per-kg charges multiply by the order weight.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/30 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Enable Advanced Shipping</p>
                  <p className="text-xs text-[#1A1A1A]/50">
                    Apply enabled surcharges to new standard and express orders.
                  </p>
                </div>
                <Switch
                  checked={advancedShippingEnabled}
                  onCheckedChange={(checked) => setValue("advancedShippingEnabled", checked)}
                />
              </div>

              <fieldset disabled={!advancedShippingEnabled} className="space-y-5 disabled:opacity-50">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-3 rounded-sm border border-[#1A1A1A]/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Additional Shipping Charge</p>
                        <p className="text-xs text-[#1A1A1A]/50">A flat surcharge on standard and express delivery.</p>
                      </div>
                      <Switch
                        checked={watch("additionalShippingChargeEnabled")}
                        onCheckedChange={(checked) => setValue("additionalShippingChargeEnabled", checked)}
                      />
                    </div>
                    <Input
                      label="Charge (PKR)"
                      {...numericField("additionalShippingCharge")}
                      error={errors.additionalShippingCharge?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-sm border border-[#1A1A1A]/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Express Additional Charge</p>
                        <p className="text-xs text-[#1A1A1A]/50">An extra surcharge applied only to express delivery.</p>
                      </div>
                      <Switch
                        checked={watch("expressAdditionalChargeEnabled")}
                        onCheckedChange={(checked) => setValue("expressAdditionalChargeEnabled", checked)}
                      />
                    </div>
                    <Input
                      label="Charge (PKR)"
                      {...numericField("expressAdditionalCharge")}
                      error={errors.expressAdditionalCharge?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-sm border border-[#1A1A1A]/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Per Item Charge</p>
                        <p className="text-xs text-[#1A1A1A]/50">Multiplied by the total quantity of items in the order.</p>
                      </div>
                      <Switch
                        checked={watch("perItemChargeEnabled")}
                        onCheckedChange={(checked) => setValue("perItemChargeEnabled", checked)}
                      />
                    </div>
                    <Input
                      label="Charge per item (PKR)"
                      {...numericField("perItemCharge")}
                      error={errors.perItemCharge?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-sm border border-[#1A1A1A]/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Per KG Charge</p>
                        <p className="text-xs text-[#1A1A1A]/50">Multiplied by product weights and quantities.</p>
                      </div>
                      <Switch
                        checked={watch("perKgChargeEnabled")}
                        onCheckedChange={(checked) => setValue("perKgChargeEnabled", checked)}
                      />
                    </div>
                    <Input
                      label="Charge per KG (PKR)"
                      {...numericField("perKgCharge")}
                      error={errors.perKgCharge?.message}
                    />
                  </div>
                </div>
              </fieldset>
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
                  <CreditCard className="h-5 w-5 text-[#B8906A]" />
                </div>
                <div>
                  <CardTitle>Cash on Delivery</CardTitle>
                  <CardDescription>
                    Manage COD availability and associated fees
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/30 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    Enable Cash on Delivery
                  </p>
                  <p className="text-xs text-[#1A1A1A]/50">
                    Allow customers to pay upon delivery
                  </p>
                </div>
                <Switch
                  checked={codEnabled}
                  onCheckedChange={(checked) => setValue("codEnabled", checked)}
                />
              </div>
              <Input
                label="COD Fee (PKR)"
                {...numericField("codFee")}
                error={errors.codFee?.message}
              />
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => shipping && reset(shipping)}>
            <RotateCcw className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
