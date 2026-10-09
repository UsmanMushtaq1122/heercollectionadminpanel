"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Facebook,
  Instagram,
  Link2,
  Loader2,
  MessageCircle,
  Music2,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api";
import { adminSocialMediaService, type SocialMediaLink } from "@/lib/admin-services";

const QUERY_KEY = ["social-media"];
const PAGE_SIZE = 10;
const ICON_OPTIONS: Array<{ value: string; label: string; Icon: LucideIcon }> = [
  { value: "facebook", label: "Facebook", Icon: Facebook },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "tiktok", label: "TikTok", Icon: Music2 },
  { value: "youtube", label: "YouTube", Icon: Youtube },
  { value: "twitter", label: "Twitter / X", Icon: Twitter },
  { value: "pinterest", label: "Pinterest", Icon: Link2 },
  { value: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "link", label: "Custom platform", Icon: Link2 },
];
const ICONS = Object.fromEntries(ICON_OPTIONS.map(({ value, Icon }) => [value, Icon])) as Record<string, LucideIcon>;

type SocialLinkForm = {
  platform: string;
  url: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
};

const EMPTY_FORM: SocialLinkForm = {
  platform: "",
  url: "",
  icon: "link",
  isActive: true,
  displayOrder: 0,
};

function iconForLink(link: SocialMediaLink): LucideIcon {
  return ICONS[link.icon.toLowerCase()] || ICONS[link.platform.toLowerCase()] || Link2;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function SocialMediaSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("order");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaLink | null>(null);
  const [form, setForm] = useState<SocialLinkForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<SocialMediaLink | null>(null);

  const linksQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminSocialMediaService.list,
  });
  const links = linksQuery.data ?? [];

  const refreshLinks = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const saveMutation = useMutation({
    mutationFn: () => editing
      ? adminSocialMediaService.update(editing.id, form)
      : adminSocialMediaService.create(form),
    onSuccess: () => {
      void refreshLinks();
      toast("success", editing ? "Social link updated." : "Social link created.");
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (error) => toast("error", getErrorMessage(error, "Could not save this social link.")),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminSocialMediaService.setStatus(id, isActive),
    onSuccess: (_, variables) => {
      void refreshLinks();
      toast("success", variables.isActive ? "Social link enabled." : "Social link disabled.");
    },
    onError: (error) => toast("error", getErrorMessage(error, "Could not update link status.")),
  });
  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; displayOrder: number }>) => adminSocialMediaService.reorder(items),
    onSuccess: () => {
      void refreshLinks();
      toast("success", "Display order updated.");
    },
    onError: (error) => toast("error", getErrorMessage(error, "Could not update display order.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminSocialMediaService.remove(id),
    onSuccess: () => {
      void refreshLinks();
      toast("success", "Social link deleted.");
      setDeleteTarget(null);
    },
    onError: (error) => toast("error", getErrorMessage(error, "Could not delete this social link.")),
  });

  const sortedLinks = useMemo(() => {
    const filtered = links.filter((link) =>
      `${link.platform} ${link.url}`.toLowerCase().includes(search.trim().toLowerCase())
    );
    return filtered.sort((left, right) => {
      if (sortBy === "platform") return left.platform.localeCompare(right.platform);
      if (sortBy === "newest") return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (sortBy === "oldest") return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return left.displayOrder - right.displayOrder || left.platform.localeCompare(right.platform);
    });
  }, [links, search, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sortedLinks.length / PAGE_SIZE));
  const pageLinks = sortedLinks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, displayOrder: links.length });
    setFormOpen(true);
  };

  const openEdit = (link: SocialMediaLink) => {
    setEditing(link);
    setForm({
      platform: link.platform,
      url: link.url,
      icon: link.icon || "link",
      isActive: link.isActive,
      displayOrder: link.displayOrder,
    });
    setFormOpen(true);
  };

  const closeForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const moveLink = (link: SocialMediaLink, direction: -1 | 1) => {
    const ordered = [...links].sort((left, right) => left.displayOrder - right.displayOrder || left.platform.localeCompare(right.platform));
    const index = ordered.findIndex((item) => item.id === link.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
    reorderMutation.mutate(ordered.map((item, displayOrder) => ({ id: item.id, displayOrder })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9A7657]">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1A1A1A]">Social Media Links</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#1A1A1A]/60">
            Manage the public social profiles shown throughout the storefront.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add social link
        </Button>
      </div>

      <section className="border-y border-[#1A1A1A]/10 py-4" aria-label="Social media list controls">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search platform or URL"
              aria-label="Search social links"
              className="h-10 w-full rounded-sm border border-[#1A1A1A]/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#9A7657] focus:ring-2 focus:ring-[#9A7657]/15"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1A1A1A]/60">
            <span className="shrink-0">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-sm border border-[#1A1A1A]/15 bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#9A7657]"
              aria-label="Sort social links"
            >
              <option value="order">Display order</option>
              <option value="platform">Platform A to Z</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </section>

      <div className="overflow-hidden rounded-sm border border-[#1A1A1A]/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Platform</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Display order</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linksQuery.isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-[#1A1A1A]/55"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading social links" /></TableCell></TableRow>
            ) : linksQuery.isError ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-red-700">{getErrorMessage(linksQuery.error, "Social links could not be loaded.")}</TableCell></TableRow>
            ) : pageLinks.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-[#1A1A1A]/55">{search ? "No social links match your search." : "No social links have been added."}</TableCell></TableRow>
            ) : pageLinks.map((link) => {
              const Icon = iconForLink(link);
              const rowBusy = statusMutation.isPending || reorderMutation.isPending || deleteMutation.isPending;
              const orderedIndex = [...links].sort((a, b) => a.displayOrder - b.displayOrder || a.platform.localeCompare(b.platform)).findIndex((item) => item.id === link.id);
              return (
                <TableRow key={link.id}>
                  <TableCell className="min-w-36 font-medium">{link.platform}</TableCell>
                  <TableCell><span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#F5F1EC] text-[#76583F]"><Icon className="h-4 w-4" aria-hidden="true" /></span></TableCell>
                  <TableCell className="max-w-[220px]">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-[#76583F] hover:underline">
                      <span className="truncate">{link.url}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${link.isActive ? "text-emerald-700" : "text-[#1A1A1A]/45"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${link.isActive ? "bg-emerald-600" : "bg-[#1A1A1A]/30"}`} />
                      {link.isActive ? "Active" : "Disabled"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 text-right tabular-nums">{link.displayOrder + 1}</span>
                      <button type="button" disabled={rowBusy || orderedIndex <= 0} onClick={() => moveLink(link, -1)} className="rounded-sm p-1.5 text-[#1A1A1A]/55 hover:bg-[#F5F1EC] hover:text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Move ${link.platform} up`} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={rowBusy || orderedIndex === links.length - 1} onClick={() => moveLink(link, 1)} className="rounded-sm p-1.5 text-[#1A1A1A]/55 hover:bg-[#F5F1EC] hover:text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Move ${link.platform} down`} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[#1A1A1A]/60">{formatDate(link.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button type="button" disabled={rowBusy} onClick={() => statusMutation.mutate({ id: link.id, isActive: !link.isActive })} className="rounded-sm px-2 py-1.5 text-xs font-medium text-[#76583F] hover:bg-[#F5F1EC] disabled:opacity-50" aria-label={`${link.isActive ? "Disable" : "Enable"} ${link.platform}`}>{link.isActive ? "Disable" : "Enable"}</button>
                      <button type="button" disabled={rowBusy} onClick={() => openEdit(link)} className="rounded-sm p-2 text-[#1A1A1A]/60 hover:bg-[#F5F1EC] hover:text-[#1A1A1A] disabled:opacity-50" aria-label={`Edit ${link.platform}`} title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button type="button" disabled={rowBusy} onClick={() => setDeleteTarget(link)} className="rounded-sm p-2 text-red-700/70 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label={`Delete ${link.platform}`} title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#1A1A1A]/55">{sortedLinks.length === 0 ? "0 links" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sortedLinks.length)} of ${sortedLinks.length} links`}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
          <span className="min-w-20 text-center text-xs text-[#1A1A1A]/55">Page {Math.min(page, totalPages)} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit social link" : "Add social link"}</DialogTitle>
            <DialogDescription>Only active links with a valid URL appear on the storefront.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="mt-5 space-y-4">
            <Input label="Platform" required maxLength={80} placeholder="e.g. Instagram or Threads" value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} />
            <Input label="Profile URL" type="url" required maxLength={2048} placeholder="https://" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#1A1A1A]">
                Icon
                <select value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} className="mt-1.5 h-10 w-full rounded-sm border border-[#1A1A1A]/15 bg-white px-3 text-sm outline-none focus:border-[#9A7657]">
                  {ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Input label="Display order" type="number" min={0} max={100000} value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Math.max(0, Number(event.target.value) || 0) }))} />
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm text-[#1A1A1A]">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 accent-[#76583F]" />
              Show this link on the storefront
            </label>
            <DialogFooter className="gap-2 border-t border-[#1A1A1A]/10 pt-4">
              <Button type="button" variant="outline" onClick={() => closeForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete social link?</DialogTitle>
            <DialogDescription>This permanently removes {deleteTarget?.platform ?? "this link"} from the social links list.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!linksQuery.isLoading && !linksQuery.isError && (
        <p className="flex items-center gap-2 text-xs text-[#1A1A1A]/45"><Share2 className="h-3.5 w-3.5" /> Changes are shared across the storefront as soon as they are saved.</p>
      )}
    </div>
  );
}