"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Calendar,
  ArrowUpDown,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel, getPaymentStatusColor } from "@/lib/utils"
import type { Order } from "@/types"
import { adminOrderService } from "@/lib/admin-services"
import { getErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/ui/status-badge"
import { Pagination } from "@/components/ui/pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"

interface OrderRow {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemCount: number
  total: number
  paymentStatus: string
  orderStatus: string
  createdAt: string
  paymentMethod: string
  shippingAddress: string
  items: {
    name: string
    quantity: number
    unitPrice: number
  }[]
}

// Normalize any status string from backend → lowercase_underscore
function normalizeStatus(s: string | null | undefined): string {
  if (!s) return ""
  return s.trim().toLowerCase().replace(/\s+/g, "_")
}

function mapOrder(order: Order): OrderRow {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone ?? "",
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
    paymentStatus: normalizeStatus(order.paymentStatus as unknown as string),
    orderStatus: normalizeStatus(order.status as unknown as string),
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    shippingAddress: [
      order.shippingAddress.addressLine1,
      order.shippingAddress.addressLine2,
      order.shippingAddress.city,
      order.shippingAddress.province,
    ]
      .filter(Boolean)
      .join(", "),
    items: order.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
  }
}

const statusTabs: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
]

const ORDER_STATUSES = [
  { value: "pending",          label: "Pending",          color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { value: "confirmed",        label: "Confirmed",        color: "bg-[#C9A27E]/10 text-[#C9A27E] border-[#C9A27E]/20" },
  { value: "processing",       label: "Processing",       color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "shipped",          label: "Shipped",          color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { value: "delivered",        label: "Delivered",        color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { value: "cancelled",        label: "Cancelled",        color: "bg-red-500/10 text-red-400 border-red-500/20" },
]

export default function OrdersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(8)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string>("")
  const [sortField, setSortField] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false)
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<OrderRow | null>(null)
  const [newOrderStatus, setNewOrderStatus] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await adminOrderService.list()
      return res.data.map(mapOrder)
    },
  })

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      // Backend expects UPPERCASE status values
      adminOrderService.bulkUpdateStatus(ids, status.toUpperCase()),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast("success", "Order status updated successfully")
      setIsBulkStatusOpen(false)
      setSelectedOrders([])
      setBulkStatus("")
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      // Backend expects UPPERCASE status values
      adminOrderService.updateStatus(id, status.toUpperCase()),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast("success", "Order status updated successfully")
      setIsUpdateStatusOpen(false)
      setSelectedOrderForStatus(null)
      setNewOrderStatus("")
    },
  })

  const filteredOrders = orders.filter((order) => {
    const normalizedStatus = normalizeStatus(order.orderStatus)
    if (activeTab && normalizedStatus !== activeTab) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !order.orderNumber.toLowerCase().includes(query) &&
        !order.customerName.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    if (dateFrom && new Date(order.createdAt) < new Date(dateFrom)) return false
    if (dateTo && new Date(order.createdAt) > new Date(dateTo)) return false
    return true
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aVal = a[sortField as keyof OrderRow]
    const bVal = b[sortField as keyof OrderRow]
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    }
    return 0
  })

  const totalPages = Math.ceil(sortedOrders.length / pageSize)
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(paginatedOrders.map((o) => o.id))
    }
  }

  const exportCSV = () => {
    const headers = [
      "Order #",
      "Customer",
      "Items",
      "Total",
      "Payment Status",
      "Order Status",
      "Date",
    ]
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.itemCount.toString(),
      o.total.toString(),
      o.paymentStatus,
      o.orderStatus,
      new Date(o.createdAt).toLocaleDateString(),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    orders.forEach((order) => {
      const key = normalizeStatus(order.orderStatus)
      if (counts[key] !== undefined) {
        counts[key]++
      }
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  const openUpdateStatus = (order: OrderRow) => {
    setSelectedOrderForStatus(order)
    setNewOrderStatus(order.orderStatus)
    setIsUpdateStatusOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-light text-[#F8F5F2] tracking-wide">Orders</h1>
            <Badge className="bg-[#C9A27E]/20 text-[#C9A27E] border-0 px-2.5 py-0.5 font-normal text-xs">
              {orders.length} total
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="sm:hidden text-[#F8F5F2]/60 hover:text-[#C9A27E] hover:bg-[#C9A27E]/10"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportCSV}
              className="text-[#F8F5F2]/60 hover:text-[#C9A27E] hover:bg-[#C9A27E]/10 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {selectedOrders.length > 0 && (
              <Button
                size="sm"
                onClick={() => setIsBulkStatusOpen(true)}
                className="bg-[#C9A27E]/20 text-[#C9A27E] hover:bg-[#C9A27E]/30 border border-[#C9A27E]/30 text-xs sm:text-sm"
              >
                Update ({selectedOrders.length})
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-0.5 mb-5 border-b border-[#F8F5F2]/10 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => { setActiveTab(tab.value); setCurrentPage(1) }}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap border-b-2 -mb-px flex items-center gap-1",
                activeTab === tab.value
                  ? "text-[#C9A27E] border-[#C9A27E]"
                  : "text-[#F8F5F2]/40 border-transparent hover:text-[#F8F5F2]/60"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  activeTab === tab.value
                    ? "bg-[#C9A27E]/20 text-[#C9A27E]"
                    : "bg-[#F8F5F2]/5 text-[#F8F5F2]/30"
                )}
              >
                {tab.value === null ? orders.length : statusCounts[tab.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className={cn(
          "gap-3 mb-5",
          showFilters ? "flex flex-col sm:flex-row sm:items-center" : "hidden sm:flex sm:items-center"
        )}>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F8F5F2]/30" />
            <Input
              placeholder="Search order # or customer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-9 bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F8F5F2]/30 hover:text-[#F8F5F2]/60"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Calendar className="w-4 h-4 text-[#F8F5F2]/30 hidden sm:block flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
              className="flex-1 sm:flex-none bg-[#F8F5F2]/5 border border-[#F8F5F2]/10 rounded-sm px-2.5 py-2 text-xs sm:text-sm text-[#F8F5F2] focus:outline-none focus:border-[#C9A27E]/50 [color-scheme:dark] min-w-0"
            />
            <span className="text-[#F8F5F2]/20 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
              className="flex-1 sm:flex-none bg-[#F8F5F2]/5 border border-[#F8F5F2]/10 rounded-sm px-2.5 py-2 text-xs sm:text-sm text-[#F8F5F2] focus:outline-none focus:border-[#C9A27E]/50 [color-scheme:dark] min-w-0"
            />
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="border border-[#F8F5F2]/10 rounded-sm p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-[#F8F5F2]/5 rounded w-2/5" />
                <div className="h-3 bg-[#F8F5F2]/5 rounded w-3/5" />
                <div className="h-3 bg-[#F8F5F2]/5 rounded w-1/4" />
              </div>
            ))
          ) : paginatedOrders.length === 0 ? (
            <div className="py-16">
              <EmptyState title="No orders found" description="Try adjusting your filters or search query." />
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border border-[#F8F5F2]/10 rounded-sm p-4 cursor-pointer hover:border-[#C9A27E]/30 transition-all duration-200",
                  selectedOrders.includes(order.id) && "border-[#C9A27E]/30 bg-[#C9A27E]/[0.03]"
                )}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelectOrder(order.id) }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded border-[#F8F5F2]/20 bg-transparent accent-[#C9A27E] flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#C9A27E] truncate">{order.orderNumber}</p>
                      <p className="text-sm text-[#F8F5F2] mt-0.5">{order.customerName}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-[#F8F5F2]/50 hover:text-[#C9A27E]">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#2A2A2A] border-[#F8F5F2]/10">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                        >
                          View Details
                        </DropdownMenuItem>
                        {order.orderStatus === "pending" && (
                          <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: "confirmed" })}
                            className="text-[#C9A27E] hover:bg-[#C9A27E]/10 focus:bg-[#C9A27E]/10 font-medium"
                          >
                            Confirm Order
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => openUpdateStatus(order)}
                          className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                        >
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5">
                          Print Invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={cn("text-xs font-normal border-0", getOrderStatusColor(order.orderStatus))}>
                    {getOrderStatusLabel(order.orderStatus)}
                  </Badge>
                  <Badge className={cn("text-xs font-normal border-0", getPaymentStatusColor(order.paymentStatus))}>
                    {order.paymentStatus}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#F8F5F2]/40">
                  <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
                  <span className="font-medium text-[#F8F5F2]/70">{formatCurrency(order.total)}</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop/Tablet Table */}
        <div className="hidden md:block border border-[#F8F5F2]/10 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="bg-[#F8F5F2]/5 border-b border-[#F8F5F2]/10">
                  <th className="px-3 lg:px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#F8F5F2]/20 bg-transparent accent-[#C9A27E]"
                    />
                  </th>
                  {[
                    { key: "orderNumber", label: "Order #", hide: "" },
                    { key: "customerName", label: "Customer", hide: "" },
                    { key: "itemCount", label: "Items", hide: "hidden lg:table-cell" },
                    { key: "total", label: "Total", hide: "" },
                    { key: "paymentStatus", label: "Payment", hide: "hidden xl:table-cell" },
                    { key: "orderStatus", label: "Status", hide: "" },
                    { key: "createdAt", label: "Date", hide: "" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider",
                        col.hide
                      )}
                    >
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 hover:text-[#F8F5F2]/60 transition-colors"
                      >
                        {col.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 lg:px-4 py-3 text-right">
                    <span className="text-xs font-medium text-[#F8F5F2]/40 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8F5F2]/5">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-3 lg:px-4 py-4">
                          <div className="h-4 rounded bg-[#F8F5F2]/5 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16">
                      <EmptyState title="No orders found" description="Try adjusting your filters or search query." />
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "hover:bg-[#F8F5F2]/[0.02] transition-colors cursor-pointer",
                        selectedOrders.includes(order.id) && "bg-[#C9A27E]/[0.03]"
                      )}
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <td className="px-3 lg:px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-[#F8F5F2]/20 bg-transparent accent-[#C9A27E]"
                        />
                      </td>
                      <td className="px-3 lg:px-4 py-4">
                        <span className="text-sm font-medium text-[#C9A27E] whitespace-nowrap">{order.orderNumber}</span>
                      </td>
                      <td className="px-3 lg:px-4 py-4">
                        <span className="text-sm text-[#F8F5F2]">{order.customerName}</span>
                      </td>
                      <td className="px-3 lg:px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-[#F8F5F2]/60">{order.itemCount} items</span>
                      </td>
                      <td className="px-3 lg:px-4 py-4">
                        <span className="text-sm font-medium text-[#F8F5F2] whitespace-nowrap">{formatCurrency(order.total)}</span>
                      </td>
                      <td className="px-3 lg:px-4 py-4 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
                        <Badge className={cn("text-xs font-normal border-0", getPaymentStatusColor(order.paymentStatus))}>
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-3 lg:px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <Badge className={cn("text-xs font-normal border-0 whitespace-nowrap", getOrderStatusColor(order.orderStatus))}>
                          {getOrderStatusLabel(order.orderStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 lg:px-4 py-4">
                        <span className="text-sm text-[#F8F5F2]/40 whitespace-nowrap">{formatDate(order.createdAt)}</span>
                      </td>
                      <td className="px-3 lg:px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-[#F8F5F2]/50 hover:text-[#C9A27E]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#2A2A2A] border-[#F8F5F2]/10">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                              className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                            >
                              View Details
                            </DropdownMenuItem>
                            {order.orderStatus === "pending" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: "confirmed" })}
                                className="text-[#C9A27E] hover:bg-[#C9A27E]/10 focus:bg-[#C9A27E]/10 font-medium"
                              >
                                Confirm Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => openUpdateStatus(order)}
                              className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                            >
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5">
                              Print Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
            <p className="text-xs sm:text-sm text-[#F8F5F2]/40 order-2 sm:order-1">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedOrders.length)} of {sortedOrders.length} orders
            </p>
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 sm:w-9 sm:h-9 text-[#F8F5F2]/50 hover:text-[#C9A27E] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm",
                    currentPage === i + 1
                      ? "bg-[#C9A27E]/20 text-[#C9A27E]"
                      : "text-[#F8F5F2]/50 hover:text-[#C9A27E]"
                  )}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 sm:w-9 sm:h-9 text-[#F8F5F2]/50 hover:text-[#C9A27E] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Update Status Dialog */}
      <Dialog open={isBulkStatusOpen} onOpenChange={setIsBulkStatusOpen}>
        <DialogContent className="bg-[#2A2A2A] border-[#F8F5F2]/10 w-[calc(100vw-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F8F5F2] font-light tracking-wide">Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#F8F5F2]/60 mb-4">
              Update status for {selectedOrders.length} selected order{selectedOrders.length > 1 ? "s" : ""}
            </p>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2]">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => { setIsBulkStatusOpen(false); setBulkStatus("") }}
              className="w-full sm:w-auto text-[#F8F5F2]/60 hover:text-[#F8F5F2] hover:bg-[#F8F5F2]/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => bulkStatusMutation.mutate({ ids: selectedOrders, status: bulkStatus })}
              disabled={!bulkStatus || bulkStatusMutation.isPending}
              className="w-full sm:w-auto bg-[#C9A27E] hover:bg-[#C9A27E]/90 text-[#1A1A1A] font-medium px-6"
            >
              {bulkStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Order Update Status Dialog */}
      <Dialog
        open={isUpdateStatusOpen}
        onOpenChange={(open) => {
          setIsUpdateStatusOpen(open)
          if (!open) { setSelectedOrderForStatus(null); setNewOrderStatus("") }
        }}
      >
        <DialogContent className="bg-[#2A2A2A] border-[#F8F5F2]/10 w-[calc(100vw-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F8F5F2] font-light tracking-wide">Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            {selectedOrderForStatus && (
              <div className="bg-[#F8F5F2]/5 rounded-sm px-4 py-3 space-y-1">
                <p className="text-xs text-[#F8F5F2]/40 uppercase tracking-wider">Order</p>
                <p className="text-sm font-medium text-[#C9A27E] break-all">{selectedOrderForStatus.orderNumber}</p>
                <p className="text-sm text-[#F8F5F2]/60">{selectedOrderForStatus.customerName}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-[#F8F5F2]/40 uppercase tracking-wider">New Status</p>
              <div className="grid grid-cols-1 gap-2">
                {ORDER_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setNewOrderStatus(status.value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-sm border text-sm font-medium transition-all duration-150 text-left",
                      newOrderStatus === status.value
                        ? `${status.color} border-current`
                        : "border-[#F8F5F2]/10 text-[#F8F5F2]/50 hover:border-[#F8F5F2]/20 hover:text-[#F8F5F2]/70"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        newOrderStatus === status.value ? "bg-current" : "bg-[#F8F5F2]/20"
                      )}
                    />
                    {status.label}
                    {selectedOrderForStatus?.orderStatus === status.value && (
                      <span className="ml-auto text-xs opacity-60">Current</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setIsUpdateStatusOpen(false); setSelectedOrderForStatus(null); setNewOrderStatus("") }}
              className="w-full sm:w-auto text-[#F8F5F2]/60 hover:text-[#F8F5F2] hover:bg-[#F8F5F2]/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOrderForStatus && newOrderStatus) {
                  updateStatusMutation.mutate({ id: selectedOrderForStatus.id, status: newOrderStatus })
                }
              }}
              disabled={
                !newOrderStatus ||
                newOrderStatus === selectedOrderForStatus?.orderStatus ||
                updateStatusMutation.isPending
              }
              className="w-full sm:w-auto bg-[#C9A27E] hover:bg-[#C9A27E]/90 text-[#1A1A1A] font-medium px-6"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}