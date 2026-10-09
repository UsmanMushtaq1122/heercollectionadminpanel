"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MailOpen,
  Archive,
  Trash2,
  Reply,
  Phone,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import type { ContactMessage } from "@/types";
import { adminMessageService } from "@/lib/admin-services";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";

const filterTabs = [
  { key: "all", label: "All", icon: Mail },
  { key: "unread", label: "Unread", icon: MailOpen },
  { key: "read", label: "Read", icon: CheckCircle2 },
  { key: "replied", label: "Replied", icon: Reply },
  { key: "archived", label: "Archived", icon: Archive },
] as const;

type FilterKey = (typeof filterTabs)[number]["key"];

export default function MessagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: () => adminMessageService.list(),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactMessage> }) => adminMessageService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminMessageService.remove(id),
    onSuccess: () => {
      toast("success", "Message deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: unknown) => {
      toast("error", getErrorMessage(error));
    },
  });
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      const matchFilter =
        activeFilter === "all" || m.status === activeFilter;
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.subject.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [messages, activeFilter, search]);

  const selected = messages.find((m) => m.id === selectedId) || null;
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  const markAsRead = (id: string) => {
    updateMutation.mutate({ id, data: { status: "read" } });
  };

  const markAsReplied = (id: string) => {
    updateMutation.mutate({ id, data: { status: "replied" } });
  };

  const archiveMessage = (id: string) => {
    updateMutation.mutate({ id, data: { status: "archived" } });
    if (selectedId === id) setSelectedId(null);
  };

  const deleteMessage = (id: string) => {
    deleteMutation.mutate(id);
    if (selectedId === id) setSelectedId(null);
  };

  const selectMessage = (id: string) => {
    setSelectedId(id);
    const msg = messages.find((m) => m.id === id);
    if (msg && msg.status === "unread") markAsRead(id);
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            Contact Messages
          </h1>
          {unreadCount > 0 && (
            <Badge className="bg-[#DC2626] text-white border-[#DC2626]">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-[#1A1A1A]/10">
        <CardContent className="p-0">
          <div className="flex min-h-[28rem] h-auto lg:h-[calc(100vh-260px)]">
            <div
              className={cn(
                "flex w-full flex-col border-r border-[#1A1A1A]/10 lg:w-[380px]",
                selected && "hidden lg:flex"
              )}
            >
              <div className="space-y-3 border-b border-[#1A1A1A]/10 p-4">
                <div className="flex gap-1 rounded-sm border border-[#1A1A1A]/10 bg-[#E8DDD4]/40 p-1">
                  {filterTabs.map((tab) => {
                    const count =
                      tab.key === "all"
                        ? messages.length
                        : messages.filter((m) => m.status === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                          activeFilter === tab.key
                            ? "bg-white text-[#B8906A] shadow-sm"
                            : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                        )}
                      >
                        {tab.label}
                        {count > 0 && (
                          <span
                            className={cn(
                              "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                              activeFilter === tab.key
                                ? "bg-[#C9A27E]/15 text-[#B8906A]"
                                : "bg-[#E8DDD4] text-[#1A1A1A]/50"
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <SearchInput
                  placeholder="Search by name or subject..."
                  onChange={setSearch}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Mail className="mb-3 h-10 w-10 text-[#1A1A1A]/30" />
                    <p className="text-sm font-medium text-[#1A1A1A]/50">No messages found</p>
                  </div>
                ) : (
                  filtered.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => selectMessage(msg.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 border-b border-[#1A1A1A]/5 px-4 py-3.5 text-left transition-colors hover:bg-[#C9A27E]/5",
                        selectedId === msg.id && "bg-[#C9A27E]/10",
                        msg.status === "unread" && "bg-[#F8F5F2]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {msg.status === "unread" && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#C9A27E]" />
                          )}
                          <span
                            className={cn(
                              "text-sm",
                              msg.status === "unread"
                                ? "font-semibold text-[#1A1A1A]"
                                : "font-medium text-[#1A1A1A]/80"
                            )}
                          >
                            {msg.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#1A1A1A]/40">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs",
                          msg.status === "unread"
                            ? "font-medium text-[#1A1A1A]/70"
                            : "text-[#1A1A1A]/50"
                        )}
                      >
                        {msg.subject}
                      </p>
                      <p className="truncate text-xs text-[#1A1A1A]/40">
                        {msg.message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div
              className={cn(
                "flex flex-1 flex-col",
                !selected && "hidden lg:flex"
              )}
            >
              {selected ? (
                <>
                  <div className="flex items-center gap-3 border-b border-[#1A1A1A]/10 px-6 py-4">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="rounded-sm p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#E8DDD4]/50 hover:text-[#1A1A1A] lg:hidden"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-[#1A1A1A]">
                        {selected.subject}
                      </h2>
                      <p className="text-xs text-[#1A1A1A]/50">
                        From {selected.name} &middot; {formatDateTime(selected.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.status !== "replied" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => markAsReplied(selected.id)}
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Reply
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-[#1A1A1A]/50"
                        onClick={() => archiveMessage(selected.id)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteMessage(selected.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C9A27E]/10 text-lg font-bold text-[#B8906A]">
                        {selected.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">
                          {selected.name}
                        </p>
                        <p className="text-sm text-[#1A1A1A]/50">{selected.email}</p>
                        {selected.phone && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#1A1A1A]/40">
                            <Phone className="h-3 w-3" />
                            {selected.phone}
                          </div>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Badge
                          variant={
                            selected.status === "unread"
                              ? "default"
                              : selected.status === "replied"
                              ? "default"
                              : selected.status === "archived"
                              ? "secondary"
                              : "outline"
                          }
                          className={cn(
                            selected.status === "replied" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            selected.status === "archived" && "bg-[#E8DDD4]/50 text-[#1A1A1A]/60"
                          )}
                        >
                          {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="mb-6" />

                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-[#1A1A1A]/80">
                        {selected.message}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A27E]/10">
                    <Mail className="h-7 w-7 text-[#B8906A]" />
                  </div>
                  <p className="text-base font-semibold text-[#1A1A1A]">
                    Select a message
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]/50">
                    Choose a conversation from the inbox to read
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
