"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Clock,
  RefreshCw,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { dashboardService } from "@/lib/admin-services";
import type { DashboardAnalytics } from "@/types";

function useDashboardData() {
  return useQuery<DashboardAnalytics>({
    queryKey: ["dashboard-analytics"],
    queryFn: () => dashboardService.getAnalytics(),
    retry: false,
  });
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardData();

  const kpiCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Total Revenue",
        value: formatCurrency(data.totalRevenue),
        change: null,
        icon: DollarSign,
        accent: "bg-[#C9A27E]/10 text-[#B8906A]",
        ring: "border-[#C9A27E]/20",
      },
      {
        label: "Total Orders",
        value: formatNumber(data.totalOrders),
        change: null,
        icon: ShoppingCart,
        accent: "bg-[#E8DDD4] text-[#1A1A1A]",
        ring: "border-[#1A1A1A]/10",
      },
      {
        label: "Total Customers",
        value: formatNumber(data.totalCustomers),
        change: null,
        icon: Users,
        accent: "bg-emerald-50 text-emerald-700",
        ring: "border-emerald-200",
      },
      {
        label: "Active Products",
        value: formatNumber(data.activeProducts),
        change: null,
        icon: Package,
        accent: "bg-[#C9A27E]/10 text-[#B8906A]",
        ring: "border-[#C9A27E]/20",
      },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded-sm bg-[#E8DDD4]" />
            <div className="mt-2 h-4 w-32 animate-pulse rounded-sm bg-[#E8DDD4]" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-sm bg-[#E8DDD4]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-sm bg-[#E8DDD4]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow-label mb-2 text-xs font-semibold uppercase tracking-widest text-[#C9A27E]">Overview</p>
            <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#1A1A1A]">
              Dashboard
            </h1>
            <div className="mt-3 h-px w-12 bg-[#C9A27E]" />
            <p className="mt-3 text-sm text-[#1A1A1A]/50">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#C9A27E]" />
            <span className="text-sm font-medium text-[#1A1A1A]">Heer Collection</span>
          </div>
        </div>

        {/* Professional Notification Box */}
        <Card className="border border-[#C9A27E]/20 bg-gradient-to-br from-[#FAF8F5] via-white to-[#F5EFEA] shadow-sm">
          <CardContent className="p-8 sm:p-10 text-center max-w-2xl mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8DDD4]/50 border border-[#C9A27E]/30 text-[#C9A27E] mb-5">
              <WifiOff className="h-7 w-7" />
            </div>
            <h2 className="font-serif text-2xl font-semibold tracking-wide text-[#1A1A1A]">
              Live Store Analytics Offline
            </h2>
            <div className="mx-auto mt-3 h-px w-12 bg-[#C9A27E]" />
            <p className="mt-4 text-sm leading-relaxed text-[#1A1A1A]/60">
              We were unable to connect to your backend API server (<code className="rounded bg-black/5 px-1.5 py-0.5 text-xs text-[#1A1A1A]">http://localhost:5000/api</code>). Live revenue graphs and order metrics will sync automatically once the backend service is started.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="gold"
                onClick={() => refetch()}
                className="flex items-center gap-2 bg-[#C9A27E] text-[#1A1A1A] hover:bg-[#C9A27E]/90 px-6 py-2.5 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
              <Link href="/admin/categories">
                <Button
                  variant="outline"
                  className="border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-black/5"
                >
                  Manage Categories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/products">
                <Button
                  variant="outline"
                  className="border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-black/5"
                >
                  Manage Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow-label mb-2 text-xs font-semibold uppercase tracking-widest text-[#C9A27E]">Overview</p>
            <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#1A1A1A]">
              Dashboard
            </h1>
            <div className="mt-3 h-px w-12 bg-[#C9A27E]" />
          </div>
        </div>
        <Card className="border border-[#1A1A1A]/10 bg-white p-12 text-center">
          <p className="text-base font-serif text-[#1A1A1A]/70">No dashboard metrics available.</p>
          <p className="mt-2 text-xs text-[#1A1A1A]/40">Analytics will populate as transactions and catalogue items are recorded.</p>
        </Card>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <p className="eyebrow-label mb-2">Overview</p>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#1A1A1A]">
            Dashboard
          </h1>
          <div className="mt-3 h-px w-12 bg-[#C9A27E]" />
          <p className="mt-3 text-sm text-[#1A1A1A]/50">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#C9A27E]" />
          <span className="text-sm font-medium text-[#1A1A1A]">Heer Collection</span>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden border-[#1A1A1A]/10 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-sm border", kpi.accent, kpi.ring)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                {kpi.change !== null && (
                  <div className={cn("flex items-center gap-1 text-xs font-semibold", kpi.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {kpi.change >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {kpi.change >= 0 ? "+" : ""}{kpi.change}%
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">{kpi.value}</p>
                <p className="mt-1 text-sm text-[#1A1A1A]/50">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg tracking-wide">Revenue Trend</CardTitle>
            <p className="text-sm text-[#1A1A1A]/50">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueChart} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg tracking-wide">Orders Trend</CardTitle>
            <p className="text-sm text-[#1A1A1A]/50">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <OrdersChart data={data.ordersChart} />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg tracking-wide">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {data.recentOrders.map((order, index) => (
                <div key={order.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="truncate text-sm font-semibold text-[#1A1A1A]">{order.orderNumber}</p>
                        <StatusBadge status={order.status} type="order" />
                      </div>
                      <p className="mt-1 truncate text-sm text-[#1A1A1A]/50">{order.customer.name}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(order.total)}</p>
                      <p className="mt-0.5 text-xs text-[#1A1A1A]/40">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg tracking-wide">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {data.topProducts.map((product, index) => (
                <div key={product.name}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[#C9A27E]/20 bg-[#C9A27E]/10 text-sm font-bold text-[#B8906A]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1A1A1A]">{product.name}</p>
                      <p className="mt-0.5 text-xs text-[#1A1A1A]/50">{formatNumber(product.sold)} units sold</p>
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="font-serif text-lg tracking-wide">Low Stock Alerts</CardTitle>
            </div>
            <Badge variant="destructive">{data.lowStockProducts.length} items</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative rounded-sm border border-red-100 bg-red-50/50 p-4 transition-colors hover:bg-red-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1A1A1A]">{product.name}</p>
                      <p className="mt-1 text-xs text-[#1A1A1A]/50">SKU: {product.sku}</p>
                    </div>
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {product.stock} left
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-100">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{
                          width: `${Math.max(5, (product.stock / product.lowStockThreshold) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#1A1A1A]/40">
                      Threshold: {product.lowStockThreshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#C9A27E]" />
              <CardTitle className="font-serif text-lg tracking-wide">Pending Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-sm border border-[#C9A27E]/20 bg-[#C9A27E]/5 px-5 py-4">
              <p className="text-sm text-[#1A1A1A]/60">
                Orders awaiting confirmation or processing
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold text-[#B8906A]">{data.pendingOrders}</span>
                <Badge variant="gold">Action Required</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}