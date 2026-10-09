"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Download,
  Eye,
  CreditCard,
  Banknote,
  Search,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDateTime, formatDate, cn } from "@/lib/utils";
import type { Transaction } from "@/types";
import { adminPaymentService } from "@/lib/admin-services";
import { getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
] as const;

type FilterKey = (typeof filterTabs)[number]["key"];

const statusConfig: Record<string, { color: string; bg: string }> = {
  completed: { color: "text-emerald-700", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { color: "text-amber-700", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { color: "text-red-700", bg: "bg-red-50 text-red-700 border-red-200" },
  refunded: { color: "text-orange-700", bg: "bg-orange-50 text-orange-700 border-orange-200" },
};

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: transactions = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => adminPaymentService.list(),
  });
  const refundMutation = useMutation({
    mutationFn: (id: string) => adminPaymentService.refund(id),
    onError: (error: unknown) => toast("error", getErrorMessage(error)),
    onSuccess: () => {
      toast("success", "Payment refunded successfully");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refundDialog, setRefundDialog] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [detailDialog, setDetailDialog] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchFilter = activeFilter === "all" || t.status === activeFilter;
      const matchSearch =
        !search ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.orderNumber.toLowerCase().includes(search.toLowerCase());
      const matchDateFrom = !dateFrom || new Date(t.createdAt) >= new Date(dateFrom);
      const matchDateTo = !dateTo || new Date(t.createdAt) <= new Date(dateTo + "T23:59:59Z");
      return matchFilter && matchSearch && matchDateFrom && matchDateTo;
    });
  }, [transactions, activeFilter, search, dateFrom, dateTo]);

  const totalRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((acc, t) => acc + t.amount, 0);
  const successfulCount = transactions.filter((t) => t.status === "completed").length;
  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const refundedCount = transactions.filter((t) => t.status === "refunded").length;

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-[#B8906A]",
      bg: "bg-[#C9A27E]/10",
    },
    {
      title: "Successful",
      value: successfulCount,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Refunded",
      value: refundedCount,
      icon: RotateCcw,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const handleRefund = () => {
    if (!refundDialog) return;
    refundMutation.mutate(refundDialog.id, {
      onSettled: () => {
        setRefundDialog(null);
        setRefundAmount("");
        setRefundReason("");
      },
    });
  };

  const processRefund = (tx: Transaction) => {
    setRefundAmount(tx.amount.toString());
    setRefundDialog(tx);
  };

  const exportReport = () => {
    const header = "Transaction ID,Order #,Amount,Method,Status,Date\n";
    const rows = filtered
      .map(
        (t) =>
          `${t.id},${t.orderNumber},${t.amount},${t.method.toUpperCase()},${t.status},${formatDateTime(t.createdAt)}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            Payments
          </h1>
          <p className="mt-1 text-sm text-[#1A1A1A]/50">
            {formatCurrency(totalRevenue)} total revenue
          </p>
        </div>
        <Button onClick={exportReport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-[#1A1A1A]/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-sm", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-[#1A1A1A]/10">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-sm border border-[#1A1A1A]/10 bg-[#E8DDD4]/40 p-1">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={cn(
                      "rounded-sm px-4 py-1.5 text-xs font-medium transition-all",
                      activeFilter === tab.key
                        ? "bg-white text-[#B8906A] shadow-sm"
                        : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-sm border border-[#1A1A1A]/10 bg-white px-2.5 py-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#1A1A1A]/40" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border-0 bg-transparent text-xs text-[#1A1A1A] outline-none"
                    placeholder="From"
                  />
                  <span className="text-[#1A1A1A]/30">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border-0 bg-transparent text-xs text-[#1A1A1A] outline-none"
                    placeholder="To"
                  />
                </div>
              </div>

              <SearchInput
                placeholder="Search transaction or order..."
                onChange={setSearch}
                className="ml-auto w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-full overflow-x-auto rounded-sm border border-[#1A1A1A]/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-[#1A1A1A]/50">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-[#1A1A1A]">
                            {txn.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{txn.orderNumber}</span>
                        </TableCell>
                        <TableCell className="text-[#1A1A1A]/50">
                          {txn.orderNumber.replace("HC-", "Customer ")}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {txn.method === "card" ? (
                              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span className="text-xs font-medium uppercase text-[#1A1A1A]/60">
                              {txn.method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border",
                              statusConfig[txn.status]?.bg
                            )}
                          >
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#1A1A1A]/50">
                          {formatDate(txn.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-sm p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#E8DDD4]/50 hover:text-[#1A1A1A]">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailDialog(txn)}>
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {txn.status === "completed" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    destructive
                                    onClick={() => processRefund(txn)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    Refund
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete information for this transaction.
          </DialogDescription>
          {detailDialog && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Transaction ID
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-[#1A1A1A]">
                    {detailDialog.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Order Number
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                    {detailDialog.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Amount
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#1A1A1A]">
                    {formatCurrency(detailDialog.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Payment Method
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {detailDialog.method === "card" ? (
                      <CreditCard className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Banknote className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="text-sm font-medium uppercase text-[#1A1A1A]">
                      {detailDialog.method}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1 border",
                      statusConfig[detailDialog.status]?.bg
                    )}
                  >
                    {detailDialog.status.charAt(0).toUpperCase() + detailDialog.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                    Date
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]">
                    {formatDateTime(detailDialog.createdAt)}
                  </p>
                </div>
                {detailDialog.reference && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                      Reference
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#1A1A1A]/60">
                      {detailDialog.reference}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Enter the refund details for transaction {refundDialog?.id}.
          </DialogDescription>
          {refundDialog && (
            <div className="mt-5 space-y-4">
              <div className="rounded-sm bg-[#F8F5F2] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                  Original Amount
                </p>
                <p className="mt-1 text-xl font-bold text-[#1A1A1A]">
                  {formatCurrency(refundDialog.amount)}
                </p>
              </div>
              <Input
                label="Refund Amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                  Reason
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter refund reason..."
                  className="flex min-h-[80px] w-full rounded-sm border border-[#1A1A1A]/10 bg-[#F8F5F2]/50 px-3 py-2 text-sm text-[#1A1A1A] transition-colors placeholder:text-[#1A1A1A]/40 focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRefundDialog(null);
                    setRefundAmount("");
                    setRefundReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefund}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Process Refund
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
