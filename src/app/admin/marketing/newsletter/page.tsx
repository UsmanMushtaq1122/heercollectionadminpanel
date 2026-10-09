"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  Download,
  Mail,
  MoreHorizontal,
  Trash2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDate, cn } from "@/lib/utils";
import type { Subscriber } from "@/types";
import { adminNewsletterService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

export default function NewsletterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscribers = [] } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: () => adminNewsletterService.list(),
  });
  const { data: stats = [] } = useQuery({
    queryKey: ["newsletter-stats"],
    queryFn: () => adminNewsletterService.getStats(),
  });
  const chartData = stats.map((s) => ({
    month: s.date,
    subscribers: s.count,
  }));
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminNewsletterService.toggleSubscriber(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] }),
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminNewsletterService.removeSubscriber(id),
    onSuccess: () => {
      toast("success", "Subscriber removed successfully");
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      const matchSearch =
        !search ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.name && s.name.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive);
      return matchSearch && matchStatus;
    });
  }, [subscribers, search, statusFilter]);

  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter((s) => s.isActive).length;
  const newThisMonth = subscribers.filter(
    (s) => new Date(s.createdAt).getMonth() === new Date().getMonth() && new Date(s.createdAt).getFullYear() === new Date().getFullYear()
  ).length;
  const growthRate = 18.4;

  const toggleActive = (id: string) => {
    const s = subscribers.find((x) => x.id === id);
    if (s) toggleMutation.mutate({ id, isActive: !s.isActive });
  };

  const removeSubscriber = (id: string) => {
    removeMutation.mutate(id);
  };

  const exportCSV = () => {
    const header = "Email,Name,Status,Subscribed Date\n";
    const rows = subscribers
      .map(
        (s) =>
          `${s.email},${s.name || ""},${s.isActive ? "Active" : "Inactive"},${formatDate(s.createdAt)}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: "Total Subscribers",
      value: totalSubscribers,
      icon: Users,
      color: "text-[#B8906A]",
      bg: "bg-[#C9A27E]/10",
    },
    {
      title: "Active Subscribers",
      value: activeSubscribers,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "New This Month",
      value: newThisMonth,
      icon: UserPlus,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Growth Rate",
      value: `+${growthRate}%`,
      icon: TrendingUp,
      color: "text-[#B8906A]",
      bg: "bg-[#C9A27E]/10",
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            Newsletter Subscribers
          </h1>
          <p className="mt-1 text-sm text-[#1A1A1A]/50">
            {totalSubscribers} total subscribers
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-base font-semibold">Subscriber Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A27E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C9A27E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                      fontSize: "13px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="subscribers"
                    stroke="#C9A27E"
                    strokeWidth={2.5}
                    fill="url(#subscriberGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-[#1A1A1A]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">All Subscribers</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 rounded-sm border border-[#1A1A1A]/10 bg-[#E8DDD4]/40 p-1">
                  {(["all", "active", "inactive"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={cn(
                        "rounded-sm px-3 py-1.5 text-xs font-medium capitalize transition-all",
                        statusFilter === f
                          ? "bg-white text-[#B8906A] shadow-sm"
                          : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <SearchInput
                  placeholder="Search by email or name..."
                  onChange={setSearch}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-sm border border-[#1A1A1A]/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-[#1A1A1A]/50">
                        No subscribers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A27E]/10 text-xs font-semibold text-[#B8906A]">
                              {s.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{s.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{s.name || "—"}</TableCell>
                        <TableCell className="text-[#1A1A1A]/50">
                          {formatDate(s.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "default" : "secondary"}>
                            {s.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-sm p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#E8DDD4]/50 hover:text-[#1A1A1A]">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleActive(s.id)}>
                                {s.isActive ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem destructive onClick={() => removeSubscriber(s.id)}>
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
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
    </div>
  );
}
