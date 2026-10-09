"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";

interface OrdersChartProps {
  data: { date: string; orders: number }[];
}

export function OrdersChart({ data }: OrdersChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F8F5F2" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => format(new Date(value), "MMM dd")}
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1A1A1A",
            border: "none",
            borderRadius: "12px",
            color: "#F8F5F2",
            padding: "12px 16px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}
          labelFormatter={(value) => format(new Date(value), "MMMM dd, yyyy")}
          formatter={(value: number) => [formatNumber(value), "Orders"]}
        />
        <Bar
          dataKey="orders"
          fill="#C9A27E"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
