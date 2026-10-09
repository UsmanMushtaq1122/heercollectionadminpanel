"use client"

import { Check } from "lucide-react"
import { cn, formatDate, getOrderStatusLabel } from "@/lib/utils"

interface StatusHistoryEntry {
  status: string
  timestamp: string
  note?: string
}

interface StatusTimelineProps {
  statusHistory: StatusHistoryEntry[]
  currentStatus: string
}

const statusOrder = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]

const allStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]

export default function StatusTimeline({
  statusHistory,
  currentStatus,
}: StatusTimelineProps) {
  const currentStatusIndex = statusOrder.indexOf(currentStatus)

  const isCancelled = currentStatus === "cancelled"

  const completedStatuses = isCancelled
    ? []
    : statusOrder.slice(0, currentStatusIndex)

  const filteredHistory = statusHistory.filter(
    (entry) => entry.status !== "cancelled"
  )

  const lastEntriesByStatus = new Map<string, StatusHistoryEntry>()
  filteredHistory.forEach((entry) => {
    lastEntriesByStatus.set(entry.status, entry)
  })

  return (
    <div className="relative">
      {isCancelled && (
        <div className="mb-4 p-3 rounded-sm bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-red-400 font-medium">Cancelled</span>
          </div>
          {statusHistory.find((h) => h.status === "cancelled")?.note && (
            <p className="text-xs text-red-400/60 mt-1 ml-4">
              {statusHistory.find((h) => h.status === "cancelled")?.note}
            </p>
          )}
          {statusHistory.find((h) => h.status === "cancelled") && (
            <p className="text-xs text-[#F8F5F2]/30 mt-1 ml-4">
              {formatDate(
                statusHistory.find((h) => h.status === "cancelled")!.timestamp
              )}
            </p>
          )}
        </div>
      )}

      <div className="space-y-0">
        {statusOrder.map((status, index) => {
          const isCompleted = !isCancelled && completedStatuses.includes(status)
          const isCurrent = !isCancelled && currentStatus === status
          const isFuture = !isCancelled && index > currentStatusIndex
          const entry = lastEntriesByStatus.get(status)

          return (
            <div key={status} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-[#C9A27E] border-[#C9A27E]"
                      : isCurrent
                      ? "bg-[#C9A27E]/20 border-[#C9A27E]"
                      : "bg-[#F8F5F2]/5 border-[#F8F5F2]/10"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-[#1A1A1A]" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[#C9A27E]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#F8F5F2]/10" />
                  )}
                </div>
                {index < statusOrder.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[2rem]",
                      isCompleted
                        ? "bg-[#C9A27E]/60"
                        : "bg-[#F8F5F2]/10"
                    )}
                  />
                )}
              </div>

              <div className="pb-6 flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted || isCurrent
                      ? "text-[#F8F5F2]"
                      : "text-[#F8F5F2]/30"
                  )}
                >
                  {getOrderStatusLabel(status)}
                </p>
                {entry ? (
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      isCompleted || isCurrent
                        ? "text-[#F8F5F2]/40"
                        : "text-[#F8F5F2]/20"
                    )}
                  >
                    {formatDate(entry.timestamp)}
                  </p>
                ) : (
                  <p className="text-xs text-[#F8F5F2]/15 mt-0.5">—</p>
                )}
                {entry?.note && (isCompleted || isCurrent) && (
                  <p className="text-xs text-[#F8F5F2]/30 mt-1 leading-relaxed">
                    {entry.note}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}