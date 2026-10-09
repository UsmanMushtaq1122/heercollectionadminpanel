"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Printer,
  Save,
  Package,
  CreditCard,
  MapPin,
  User,
  Mail,
  Phone,
  Clock,
  Truck,
  FileText,
  Send,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import {
  cn,
  formatCurrency,
  formatDate,
  getOrderStatusColor,
  getOrderStatusLabel,
  getPaymentStatusColor,
} from "@/lib/utils"
import { getErrorMessage } from "@/lib/api"
import type { Order, OrderEmailStatus } from "@/types"
import { adminOrderService } from "@/lib/admin-services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import StatusTimeline from "@/components/orders/status-timeline"

interface OrderDetail {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  createdAt: string
  shippingAddress: string
  subtotal: number
  shipping: number
  shippingAdditional: number
  discount: number
  codFee: number
  total: number
  trackingNumber: string
  trackingUrl: string
  courierName: string
  estimatedDelivery: string
  internalNotes: string
  items: {
    name: string
    quantity: number
    unitPrice: number
    total: number
    size?: string
    color?: string
  }[]
  statusHistory: {
    status: string
    timestamp: string
    note?: string
  }[]
}

function parseShippingAddress(rawAddress: any): string {
  if (!rawAddress) return "No shipping address provided";
  let addr = rawAddress;
  if (typeof rawAddress === "string") {
    try {
      addr = JSON.parse(rawAddress);
    } catch {
      return rawAddress;
    }
  }
  if (typeof addr !== "object" || addr === null) return String(addr);

  const fullName =
    addr.fullName ||
    [addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
    addr.name ||
    "";
  const addressLine1 = addr.addressLine1 || addr.address1 || addr.address || "";
  const addressLine2 = addr.addressLine2 || addr.address2 || "";
  const city = addr.city || "";
  const province = addr.province || addr.state || "";
  const postalCode = addr.postalCode || addr.zip || "";
  const country = addr.country || "";

  return [fullName, addressLine1, addressLine2, city, province, postalCode, country]
    .filter(Boolean)
    .join("\n");
}

function mapOrderDetail(order: Order): OrderDetail {
  let rawAddress: any = order.shippingAddress;
  if (typeof rawAddress === "string") {
    try {
      rawAddress = JSON.parse(rawAddress);
    } catch {
      rawAddress = {};
    }
  }
  rawAddress = rawAddress || {};

  const customerName =
    order.customer?.name ||
    rawAddress.fullName ||
    [rawAddress.firstName, rawAddress.lastName].filter(Boolean).join(" ") ||
    "Customer";

  const customerEmail = order.customer?.email || rawAddress.email || "N/A";
  const customerPhone = order.customer?.phone ?? rawAddress.phone ?? "";

  let rawHistory: any = order.statusHistory;
  if (typeof rawHistory === "string") {
    try {
      rawHistory = JSON.parse(rawHistory);
    } catch {
      rawHistory = [];
    }
  }
  if (!Array.isArray(rawHistory)) {
    rawHistory = [];
  }

  const statusHistory = rawHistory.map((entry: any) => ({
    status: String(entry.status || entry.to || order.status || "pending").toLowerCase(),
    timestamp: entry.timestamp || entry.at || entry.createdAt || order.createdAt || new Date().toISOString(),
    note: entry.note || entry.notes || entry.reason || (entry.from ? `Status changed from ${entry.from} to ${entry.to || entry.status}` : undefined),
  }));

  const items = Array.isArray(order.items)
    ? order.items.map((item: any) => ({
        name: item.product?.name || item.name || "Product",
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.price || item.unitPrice || 0),
        total: Number(item.total || (Number(item.price || 0) * Number(item.quantity || 1))),
        size: item.size,
        color: item.color,
      }))
    : [];

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: String(order.status || "pending").toLowerCase(),
    createdAt: order.createdAt,
    shippingAddress: parseShippingAddress(order.shippingAddress),
    subtotal: Number(order.subtotal || 0),
    shipping: Number(order.shippingBreakdown?.baseCharge ?? order.shippingCost ?? 0),
    shippingAdditional: Number(order.shippingBreakdown?.additionalCharge || 0),
    discount: Number(order.discount || 0),
    codFee: Number(order.codFee || 0),
    total: Number(order.total || 0),
    trackingNumber: order.trackingNumber ?? "",
    trackingUrl: order.trackingUrl ?? "",
    courierName: order.courierName ?? "",
    estimatedDelivery: order.estimatedDelivery ?? "",
    internalNotes: order.internalNotes ?? "",
    items,
    statusHistory,
  };
}

const EMAIL_STATUSES: OrderEmailStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [cancellationReason, setCancellationReason] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [courierName, setCourierName] = useState("")
  const [estimatedDelivery, setEstimatedDelivery] = useState("")
  const [previewStatus, setPreviewStatus] = useState<OrderEmailStatus>("SHIPPED")
  const [emailNotice, setEmailNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null)

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await adminOrderService.get(orderId)
      return mapOrderDetail(res)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      adminOrderService.updateStatus(
        orderId,
        status,
        statusNote || undefined,
        status === "cancelled" ? cancellationReason || undefined : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      setNewStatus("")
      setStatusNote("")
      setCancellationReason("")
    },
  })

  const notesMutation = useMutation({
    mutationFn: ({ notes }: { notes: string }) =>
      adminOrderService.updateNotes(orderId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
    },
  })

  const trackingMutation = useMutation({
    mutationFn: () =>
      adminOrderService.updateTracking(
        orderId,
        trackingNumber,
        trackingUrl,
        courierName,
        estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
    },
  })

  const previewQuery = useQuery({
    queryKey: ["order-email-preview", orderId, previewStatus],
    queryFn: () => adminOrderService.previewEmail(orderId, previewStatus),
    enabled: Boolean(orderId),
  })

  const resendMutation = useMutation({
    mutationFn: ({ status }: { status: OrderEmailStatus }) =>
      adminOrderService.resendEmail(orderId, status),
    onSuccess: (result) => {
      setEmailNotice({
        kind: "success",
        text: `${result.status} email sent to ${result.to} — “${result.subject}”`,
      })
    },
    onError: (error) => {
      setEmailNotice({ kind: "error", text: getErrorMessage(error) })
    },
  })

  const previewEmail =
    previewQuery.data?.emails.find((e) => e.status === previewStatus) ??
    previewQuery.data?.emails[0]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="h-10 w-48 bg-[#F8F5F2]/5 animate-pulse rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-[#F8F5F2]/5 animate-pulse rounded-sm" />
                <div className="h-48 bg-[#F8F5F2]/5 animate-pulse rounded-sm" />
              </div>
              <div className="space-y-6">
                <div className="h-40 bg-[#F8F5F2]/5 animate-pulse rounded-sm" />
                <div className="h-32 bg-[#F8F5F2]/5 animate-pulse rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center border border-[#F8F5F2]/10 bg-[#242424] p-8 rounded-sm">
          <p className="text-[#F8F5F2] font-medium text-lg mb-2">Order Details Not Found</p>
          <p className="text-[#F8F5F2]/50 text-sm mb-6">
            {error instanceof Error ? error.message : "The requested order could not be loaded."}
          </p>
          <Button
            onClick={() => router.push("/admin/orders")}
            className="bg-[#C9A27E] hover:bg-[#b8916d] text-white"
          >
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/orders")}
              className="text-[#F8F5F2]/50 hover:text-[#C9A27E]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-light text-[#F8F5F2] tracking-wide">
                {order.orderNumber}
              </h1>
              <p className="text-sm text-[#F8F5F2]/40 mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => window.print()}
            className="text-[#F8F5F2]/60 hover:text-[#C9A27E] hover:bg-[#C9A27E]/10"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <CreditCard className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Order Information
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#F8F5F2]/40 mb-1">Order Number</p>
                  <p className="text-sm text-[#C9A27E] font-medium">
                    {order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#F8F5F2]/40 mb-1">Date</p>
                  <p className="text-sm text-[#F8F5F2]">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#F8F5F2]/40 mb-1">Payment Method</p>
                  <p className="text-sm text-[#F8F5F2]">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-[#F8F5F2]/40 mb-1">Payment Status</p>
                  <Badge
                    className={cn(
                      "text-xs font-normal border-0",
                      getPaymentStatusColor(order.paymentStatus)
                    )}
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <Package className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Order Items
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F8F5F2]/10">
                      <th className="text-left py-3 text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="text-center py-3 text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider w-20">
                        Qty
                      </th>
                      <th className="text-right py-3 text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider w-32">
                        Unit Price
                      </th>
                      <th className="text-right py-3 text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider w-32">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8F5F2]/5">
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#F8F5F2]">
                              {item.name}
                            </span>
                            {(item.size || item.color) && (
                              <div className="flex items-center gap-2 mt-1">
                                {item.size && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-white/10 text-[#F8F5F2]/80 border border-white/10">
                                    Size: {item.size}
                                  </span>
                                )}
                                {item.color && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[#C9A27E]/15 text-[#C9A27E] border border-[#C9A27E]/20">
                                    Color: {item.color}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-sm text-[#F8F5F2]/60">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-sm text-[#F8F5F2]/60">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-sm text-[#F8F5F2]">
                            {formatCurrency(item.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-[#F8F5F2]/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#F8F5F2]/40">Subtotal</span>
                  <span className="text-[#F8F5F2]">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#F8F5F2]/40">Shipping</span>
                  <span className="text-[#F8F5F2]">
                    {formatCurrency(order.shipping)}
                  </span>
                </div>
                {order.shippingAdditional > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#F8F5F2]/40">Additional Shipping Charges</span>
                    <span className="text-[#F8F5F2]">
                      {formatCurrency(order.shippingAdditional)}
                    </span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#F8F5F2]/40">Discount</span>
                    <span className="text-green-400">
                      -{formatCurrency(order.discount)}
                    </span>
                  </div>
                )}
                {order.codFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#F8F5F2]/40">COD Fee</span>
                    <span className="text-[#F8F5F2]">
                      {formatCurrency(order.codFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-[#F8F5F2]/10">
                  <span className="text-[#F8F5F2] font-medium">Total</span>
                  <span className="text-[#C9A27E] font-medium text-lg">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <User className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Customer
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#F8F5F2]/30" />
                  <span className="text-sm text-[#F8F5F2]">
                    {order.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#F8F5F2]/30" />
                  <span className="text-sm text-[#F8F5F2]/60">
                    {order.customerEmail}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#F8F5F2]/30" />
                  <span className="text-sm text-[#F8F5F2]/60">
                    {order.customerPhone}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <MapPin className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Shipping Address
                </h2>
              </div>
              <p className="text-sm text-[#F8F5F2]/60 whitespace-pre-line leading-relaxed">
                {order.shippingAddress}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <Clock className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Order Timeline
                </h2>
              </div>
              <StatusTimeline
                statusHistory={order.statusHistory}
                currentStatus={order.orderStatus}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <Truck className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Update Status
                </h2>
              </div>
              <div className="space-y-3">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2]">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      Pending
                    </SelectItem>
                    <SelectItem value="confirmed">
                      Confirmed
                    </SelectItem>
                    <SelectItem value="processing">
                      Processing
                    </SelectItem>
                    <SelectItem value="shipped">
                      Shipped
                    </SelectItem>
                    <SelectItem value="delivered">
                      Delivered
                    </SelectItem>
                    <SelectItem value="cancelled">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    statusMutation.mutate({ status: newStatus })
                  }
                  disabled={!newStatus || statusMutation.isPending}
                  className="w-full bg-[#F8F5F2]/10 hover:bg-[#F8F5F2]/20 text-[#C9A27E] border border-[#C9A27E]/40 font-medium"
                >
                  {statusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
                <p className="text-[11px] text-[#F8F5F2]/35 leading-relaxed">
                  Changing the status automatically emails the customer.
                </p>

                {newStatus === "cancelled" && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] text-[#F8F5F2]/50 uppercase tracking-wider">
                      Cancellation reason
                    </label>
                    <Textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="e.g. Requested by customer, item out of stock…"
                      rows={3}
                      className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50 resize-none"
                    />
                    <p className="text-[11px] text-[#F8F5F2]/35 leading-relaxed">
                      Shown in the cancellation email. Paid orders also get a
                      refund amount of {formatCurrency(order.total)}.
                    </p>
                  </div>
                )}

                {newStatus !== "" && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] text-[#F8F5F2]/50 uppercase tracking-wider">
                      Internal note (optional)
                    </label>
                    <Input
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Logged on the order timeline only"
                      className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50"
                    />
                  </div>
                )}
                {order.orderStatus === "pending" && (
                  <Button
                    onClick={() =>
                      statusMutation.mutate({ status: "confirmed" })
                    }
                    disabled={statusMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold tracking-wide"
                  >
                    {statusMutation.isPending && newStatus === "confirmed"
                      ? "Confirming..."
                      : "Confirm Order"}
                  </Button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <FileText className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Internal Notes
                </h2>
              </div>
              <Textarea
                value={internalNotes || order.internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes about this order..."
                rows={4}
                className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50 resize-none mb-3"
              />
              <Button
                onClick={() =>
                  notesMutation.mutate({ notes: internalNotes })
                }
                disabled={notesMutation.isPending}
                className="w-full bg-[#F8F5F2]/5 hover:bg-[#F8F5F2]/10 text-[#F8F5F2] border border-[#F8F5F2]/10"
              >
                <Save className="w-4 h-4 mr-2" />
                {notesMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <Truck className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Courier &amp; Tracking
                </h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#F8F5F2]/40 mb-1">
                    Courier name
                  </label>
                  <Input
                    value={courierName || order.courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="e.g. TCS Express"
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#F8F5F2]/40 mb-1">
                    Tracking number
                  </label>
                  <Input
                    value={trackingNumber || order.trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#F8F5F2]/40 mb-1">
                    Tracking link
                  </label>
                  <Input
                    value={trackingUrl || order.trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://courier.com/track/…"
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#F8F5F2]/40 mb-1">
                    Estimated delivery
                  </label>
                  <Input
                    type="date"
                    value={
                      estimatedDelivery ||
                      (order.estimatedDelivery
                        ? order.estimatedDelivery.slice(0, 10)
                        : "")
                    }
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] focus:border-[#C9A27E]/50"
                  />
                </div>
                <Button
                  onClick={() => trackingMutation.mutate()}
                  disabled={trackingMutation.isPending}
                  className="w-full bg-[#F8F5F2]/5 hover:bg-[#F8F5F2]/10 text-[#F8F5F2] border border-[#F8F5F2]/10"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {trackingMutation.isPending ? "Saving..." : "Save Tracking"}
                </Button>
                <p className="text-[11px] text-[#F8F5F2]/35 leading-relaxed">
                  Courier and estimated delivery appear in the Shipped email.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="border border-[#F8F5F2]/10 bg-[#1A1A1A] rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F8F5F2]/10">
                <Mail className="w-5 h-5 text-[#C9A27E]" />
                <h2 className="text-sm font-medium text-[#F8F5F2] uppercase tracking-wider">
                  Email Preview
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {EMAIL_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPreviewStatus(status)}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors border",
                      previewStatus === status
                        ? "bg-[#C9A27E] text-[#1A1A1A] border-[#C9A27E]"
                        : "bg-[#F8F5F2]/5 text-[#F8F5F2]/60 border-[#F8F5F2]/10 hover:border-[#C9A27E]/40 hover:text-[#C9A27E]"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {previewQuery.isLoading && (
                <div className="flex items-center justify-center py-10 gap-2 text-[#F8F5F2]/40 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering template…
                </div>
              )}

              {previewQuery.isError && (
                <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{getErrorMessage(previewQuery.error)}</span>
                </div>
              )}

              {previewEmail && !previewQuery.isLoading && (
                <>
                  <div className="space-y-1 mb-3">
                    <p className="text-[10px] text-[#F8F5F2]/35 uppercase tracking-wider">
                      Subject
                    </p>
                    <p className="text-xs text-[#F8F5F2] break-words">
                      {previewEmail.subject}
                    </p>
                    <p className="text-[10px] text-[#F8F5F2]/35 uppercase tracking-wider pt-2">
                      Headline
                    </p>
                    <p className="text-xs text-[#C9A27E]">
                      {previewEmail.headline}
                    </p>
                    <p className="text-[10px] text-[#F8F5F2]/35 uppercase tracking-wider pt-2">
                      To
                    </p>
                    <p className="text-xs text-[#F8F5F2]/60 break-all">
                      {previewQuery.data?.customerEmail ?? "No email on file"}
                    </p>
                  </div>

                  <div className="rounded border border-[#F8F5F2]/10 overflow-hidden bg-white">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F5F2]/5 border-b border-[#F8F5F2]/10">
                      <Eye className="w-3 h-3 text-[#F8F5F2]/40" />
                      <span className="text-[10px] text-[#F8F5F2]/40 uppercase tracking-wider">
                        Rendered email
                      </span>
                    </div>
                    <iframe
                      title={`${previewStatus} email preview`}
                      srcDoc={previewEmail.html}
                      sandbox=""
                      className="w-full h-[560px] border-0 bg-white"
                    />
                  </div>

                  <details className="mt-3 group">
                    <summary className="text-[11px] text-[#F8F5F2]/40 cursor-pointer hover:text-[#C9A27E] transition-colors">
                      View plain-text version
                    </summary>
                    <pre className="mt-2 p-3 rounded bg-[#F8F5F2]/5 border border-[#F8F5F2]/10 text-[11px] text-[#F8F5F2]/60 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono">
                      {previewEmail.text}
                    </pre>
                  </details>

                  <Button
                    onClick={() =>
                      resendMutation.mutate({ status: previewStatus })
                    }
                    disabled={
                      resendMutation.isPending || !previewQuery.data?.customerEmail
                    }
                    className="w-full mt-4 bg-[#F8F5F2]/10 hover:bg-[#F8F5F2]/20 text-[#C9A27E] border border-[#C9A27E]/40 font-medium"
                  >
                    {resendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {resendMutation.isPending
                      ? "Sending…"
                      : `Resend ${previewStatus} Email`}
                  </Button>
                  <p className="text-[11px] text-[#F8F5F2]/35 leading-relaxed mt-2">
                    Sends the real email to the customer without changing the
                    order status.
                  </p>
                </>
              )}

              {emailNotice && (
                <div
                  className={cn(
                    "flex items-start gap-2 mt-3 p-3 rounded text-xs border",
                    emailNotice.kind === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  )}
                >
                  {emailNotice.kind === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  )}
                  <span className="break-words">{emailNotice.text}</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}