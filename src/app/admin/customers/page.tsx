"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Calendar,
  Eye,
  MoreHorizontal,
  User,
  TrendingUp,
  FileText,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  Filter,
  X,
  Star,
  CheckCircle2,
  Package,
  CreditCard,
  Clock,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Customer as CustomerDTO } from "@/types";
import { adminCustomerService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  status: "active" | "inactive";
  joinedDate: string;
  addresses: { label: string; address: string; city: string; isDefault: boolean }[];
  orders: { id: string; date: string; total: number; status: string; items: number }[];
  notes: string;
  tier: "gold" | "silver" | "platinum";
}

function mapCustomer(c: CustomerDTO): Customer {
  const initials = c.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone ?? "",
    avatar: c.avatar ?? initials,
    totalOrders: c.totalOrders,
    totalSpent: c.totalSpent,
    lastOrder: c.lastOrderAt ?? c.createdAt,
    status: c.isActive ? "active" : "inactive",
    joinedDate: c.createdAt,
    addresses: (c.addresses ?? []).map((a) => ({
      label: a.label,
      address: [a.addressLine1, a.addressLine2].filter(Boolean).join(", "),
      city: a.city,
      isDefault: a.isDefault ?? false,
    })),
    orders: [],
    notes: c.notes ?? "",
    tier: "silver",
  };
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-[#E8DDD4]/40 text-[#1A1A1A]/50 border-[#E8DDD4]",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const tierColors: Record<string, string> = {
  platinum: "bg-[#C9A27E]/10 text-[#B8906A] border-[#C9A27E]/30",
  gold: "bg-amber-50 text-amber-700 border-amber-200",
  silver: "bg-[#E8DDD4]/40 text-[#1A1A1A]/60 border-[#E8DDD4]",
};

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await adminCustomerService.list();
      return res.map(mapCustomer);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerDTO> }) =>
      adminCustomerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortField, setSortField] = useState<"name" | "totalSpent" | "totalOrders" | "lastOrder">("lastOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editNotes, setEditNotes] = useState("");

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return a.name.localeCompare(b.name) * dir;
    if (sortField === "totalSpent") return (a.totalSpent - b.totalSpent) * dir;
    if (sortField === "totalOrders") return (a.totalOrders - b.totalOrders) * dir;
    return (new Date(a.lastOrder).getTime() - new Date(b.lastOrder).getTime()) * dir;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleCustomerStatus = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    updateMutation.mutate({
      id,
      data: { isActive: customer.status !== "active" },
    });
  };

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditNotes(customer.notes);
    setDetailOpen(true);
  };

  const saveNotes = () => {
    if (selectedCustomer) {
      updateMutation.mutate(
        {
          id: selectedCustomer.id,
          data: { notes: editNotes },
        },
        { onSuccess: () => toast("success", "Customer updated successfully") }
      );
    }
  };

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const activeCount = customers.filter((c) => c.status === "active").length;
  const avgSpent = totalRevenue / customers.length;

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <div className="mx-auto w-full max-w-[1400px] min-w-0 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-wide text-[#1A1A1A]">
                Customers
              </h1>
              <p className="text-[#1A1A1A]/50 mt-1 font-light">
                {customers.length} total customers
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[#C9A27E] text-[#B8906A] hover:bg-[#C9A27E] hover:text-white font-light tracking-wide"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                  Total Customers
                </p>
                <p className="text-2xl font-light text-[#1A1A1A] mt-1">{customers.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                  Active
                </p>
                <p className="text-2xl font-light text-[#1A1A1A] mt-1">{activeCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-light text-[#B8906A] mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                  Avg. Spent
                </p>
                <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                  {formatCurrency(Math.round(avgSpent))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-[#E8DDD4] bg-[#F8F5F2]/50 font-light focus:border-[#C9A27E] focus:ring-[#C9A27E]/20"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "active", "inactive"] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      className={cn(
                        "font-light tracking-wide text-xs uppercase",
                        statusFilter === status
                          ? "bg-[#1A1A1A] text-white"
                          : "border-[#E8DDD4] text-[#1A1A1A]/60 hover:border-[#C9A27E] hover:text-[#B8906A]"
                      )}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1A1A1A]/10">
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        <button
                          onClick={() => toggleSort("name")}
                          className="flex items-center gap-1 hover:text-[#B8906A] transition-colors"
                        >
                          Name
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        Phone
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        <button
                          onClick={() => toggleSort("totalOrders")}
                          className="flex items-center gap-1 hover:text-[#B8906A] transition-colors"
                        >
                          Orders
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        <button
                          onClick={() => toggleSort("totalSpent")}
                          className="flex items-center gap-1 hover:text-[#B8906A] transition-colors"
                        >
                          Total Spent
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        <button
                          onClick={() => toggleSort("lastOrder")}
                          className="flex items-center gap-1 hover:text-[#B8906A] transition-colors"
                        >
                          Last Order
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-widest text-[#1A1A1A]/40 font-medium w-16">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="border-[#1A1A1A]/10 hover:bg-[#F8F5F2]/30 cursor-pointer transition-colors"
                        onClick={() => openDetail(customer)}
                      >
                        <TableCell>
                          <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-light tracking-wider">
                            {customer.avatar}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[#1A1A1A] text-sm">{customer.name}</p>
                            <p className="text-xs text-[#1A1A1A]/40 font-light">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[#1A1A1A]/70 font-light">
                          {customer.phone}
                        </TableCell>
                        <TableCell className="text-sm text-[#1A1A1A]/70 font-light">
                          {customer.totalOrders}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-[#B8906A]">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                        <TableCell className="text-sm text-[#1A1A1A]/50 font-light">
                          {formatDate(customer.lastOrder)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px] uppercase tracking-wider font-medium border",
                              statusColors[customer.status]
                            )}
                          >
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-[#1A1A1A]/10 z-50" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(customer);
                                }}
                                className="font-light text-sm cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCustomerStatus(customer.id);
                                }}
                                className="font-light text-sm cursor-pointer"
                              >
                                {customer.status === "active" ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {sorted.length === 0 && (
                <div className="text-center py-16">
                  <User className="w-12 h-12 text-[#1A1A1A]/10 mx-auto mb-4" />
                  <p className="text-[#1A1A1A]/40 font-light">No customers found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 bg-white border-0 shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
          {selectedCustomer && (
            <>
              {/* ── Sticky Header ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DDD4]/60 bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] flex items-center justify-center text-white text-sm font-medium tracking-wider shadow-sm">
                    {selectedCustomer.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#1A1A1A] leading-tight">{selectedCustomer.name}</h2>
                      <Badge
                        className={cn(
                          "text-[9px] uppercase tracking-widest font-semibold border px-2 py-0.5",
                          tierColors[selectedCustomer.tier]
                        )}
                      >
                        {selectedCustomer.tier}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[9px] uppercase tracking-widest font-semibold border px-2 py-0.5",
                          statusColors[selectedCustomer.status]
                        )}
                      >
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#1A1A1A]/40 font-light mt-0.5">Customer Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:bg-[#F8F5F2] transition-all duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* Contact Info */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]/60 font-light">
                    <Mail className="w-3.5 h-3.5 text-[#C9A27E]" />
                    {selectedCustomer.email}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]/60 font-light">
                    <Phone className="w-3.5 h-3.5 text-[#C9A27E]" />
                    {selectedCustomer.phone || <span className="italic text-[#1A1A1A]/30">No phone</span>}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/30 font-light ml-auto">
                    <Calendar className="w-3.5 h-3.5" />
                    Member since {formatDate(selectedCustomer.joinedDate)}
                  </span>
                </div>

                {/* Active Toggle Row */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F8F5F2] rounded-lg border border-[#E8DDD4]/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn("w-4 h-4", selectedCustomer.status === "active" ? "text-emerald-500" : "text-[#1A1A1A]/20")} />
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      Account Status
                    </span>
                    <span className="text-xs text-[#1A1A1A]/40 font-light">
                      — toggle to {selectedCustomer.status === "active" ? "deactivate" : "activate"} this customer
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#1A1A1A]/40 font-light">
                      {selectedCustomer.status === "active" ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={selectedCustomer.status === "active"}
                      onCheckedChange={() => toggleCustomerStatus(selectedCustomer.id)}
                    />
                  </div>
                </div>

                <Separator className="bg-[#E8DDD4]/40" />

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F8F5F2] rounded-lg p-4 border border-[#E8DDD4]/50 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#C9A27E]" />
                      <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/40 font-semibold">Orders</p>
                    </div>
                    <p className="text-2xl font-light text-[#1A1A1A]">{selectedCustomer.totalOrders}</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#C9A27E]/10 to-[#E8DDD4]/30 rounded-lg p-4 border border-[#C9A27E]/20 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#C9A27E]" />
                      <p className="text-[10px] uppercase tracking-widest text-[#B8906A] font-semibold">Total Spent</p>
                    </div>
                    <p className="text-2xl font-semibold text-[#B8906A]">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  </div>
                  <div className="bg-[#F8F5F2] rounded-lg p-4 border border-[#E8DDD4]/50 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C9A27E]" />
                      <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/40 font-semibold">Last Order</p>
                    </div>
                    <p className="text-base font-medium text-[#1A1A1A] leading-tight">{formatDate(selectedCustomer.lastOrder)}</p>
                  </div>
                </div>

                {/* Addresses */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#C9A27E]" />
                    <h4 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">Addresses</h4>
                  </div>
                  {selectedCustomer.addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 rounded-lg border border-dashed border-[#E8DDD4] bg-[#F8F5F2]/50">
                      <MapPin className="w-6 h-6 text-[#1A1A1A]/15 mb-2" />
                      <p className="text-xs text-[#1A1A1A]/30 font-light">No addresses on file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.addresses.map((addr, i) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 bg-[#F8F5F2] rounded-lg border border-[#E8DDD4]/50">
                          <div className="w-7 h-7 rounded-full bg-[#C9A27E]/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#B8906A]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1A1A1A]">{addr.label}</span>
                              {addr.isDefault && (
                                <Badge className="text-[9px] uppercase tracking-wider bg-[#C9A27E]/10 text-[#B8906A] border border-[#C9A27E]/20 px-1.5">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-[#1A1A1A]/50 font-light mt-0.5 truncate">
                              {addr.address}{addr.city ? `, ${addr.city}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order History */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-[#C9A27E]" />
                    <h4 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">Order History</h4>
                    {selectedCustomer.orders.length > 0 && (
                      <span className="ml-auto text-xs text-[#1A1A1A]/30 font-light">{selectedCustomer.orders.length} order{selectedCustomer.orders.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {selectedCustomer.orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 rounded-lg border border-dashed border-[#E8DDD4] bg-[#F8F5F2]/50">
                      <ShoppingBag className="w-6 h-6 text-[#1A1A1A]/15 mb-2" />
                      <p className="text-xs text-[#1A1A1A]/30 font-light">No orders placed yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3.5 bg-[#F8F5F2] rounded-lg border border-[#E8DDD4]/50 hover:border-[#C9A27E]/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-3.5 h-3.5 text-[#1A1A1A]/40" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1A1A1A]">{order.id}</p>
                              <p className="text-xs text-[#1A1A1A]/40 font-light">
                                {formatDate(order.date)} &middot; {order.items} item{order.items !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#B8906A]">{formatCurrency(order.total)}</p>
                            <Badge className={cn("text-[9px] uppercase tracking-wider font-medium border mt-0.5", statusColors[order.status])}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-[#C9A27E]" />
                    <h4 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">Internal Notes</h4>
                  </div>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="border-[#E8DDD4] bg-[#F8F5F2]/50 font-light text-sm min-h-[90px] focus:border-[#C9A27E] focus:ring-[#C9A27E]/20 rounded-lg resize-none"
                    placeholder="Add private notes about this customer — visible only to admins..."
                  />
                </div>
              </div>

              {/* ── Sticky Footer ── */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8DDD4]/60 bg-[#F8F5F2]/60 sticky bottom-0 shrink-0">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="border-[#E8DDD4] text-[#1A1A1A]/60 hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] font-light text-sm tracking-wide px-5"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] font-light text-sm tracking-wide px-6 shadow-sm"
                  onClick={saveNotes}
                >
                  Save Notes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
