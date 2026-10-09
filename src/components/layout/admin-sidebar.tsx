"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  ChevronDown,
  Image,
  FileText,
  Quote,
  HelpCircle,
  File,
  MapPin,
  Briefcase,
  Mail,
  MessageSquare,
  Ticket,
  CreditCard,
  Settings,
  Truck,
  Search,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
  Sparkles,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toggleSidebar } from "@/store/slices/uiSlice";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface NavItemSingle {
  label: string;
  href: string;
  icon: React.ElementType;
}

const contentSection: NavSection = {
  label: "Content",
  icon: ChevronDown,
  items: [
    { label: "Banners", href: "/admin/content/banners", icon: Image },
    { label: "Collections", href: "/admin/content/collections", icon: Sparkles },
    { label: "Editorial", href: "/admin/content/editorial", icon: FileText },
    { label: "Testimonials", href: "/admin/content/testimonials", icon: Quote },
    { label: "FAQs", href: "/admin/content/faqs", icon: HelpCircle },
    { label: "Pages", href: "/admin/content/pages", icon: File },
    { label: "Locations", href: "/admin/content/locations", icon: MapPin },
    { label: "Careers", href: "/admin/content/careers", icon: Briefcase },
  ],
};

const marketingSection: NavSection = {
  label: "Marketing",
  icon: ChevronDown,
  items: [
    { label: "Newsletter", href: "/admin/marketing/newsletter", icon: Mail },
    { label: "Messages", href: "/admin/marketing/messages", icon: MessageSquare },
  ],
};

const settingsSection: NavSection = {
  label: "Settings",
  icon: ChevronDown,
  items: [
    { label: "General", href: "/admin/settings", icon: Settings },
    { label: "Social Media Links", href: "/admin/settings/social-media", icon: Share2 },
    { label: "Shipping", href: "/admin/settings/shipping", icon: Truck },
    { label: "SEO", href: "/admin/settings/seo", icon: Search },
    { label: "Admin Users", href: "/admin/settings/users", icon: Shield },
  ],
};

const singleNavItems: NavItemSingle[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => isActive(item.href));

  const sections: (NavSection | NavItemSingle)[] = [
    ...singleNavItems.slice(0, 5),
    contentSection,
    marketingSection,
    ...singleNavItems.slice(5),
    settingsSection,
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-[#1A1A1A] text-[#F8F5F2] transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Boxes className="h-6 w-6 text-[#C9A27E]" />
          <span className="flex flex-col">
            <span className="font-serif text-lg font-semibold leading-none tracking-[0.2em] text-[#C9A27E]">
              HEER
            </span>
            {!collapsed && (
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.3em] text-[#F8F5F2]/50">
                Collection
              </span>
            )}
          </span>
        </Link>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-[#F8F5F2]/50 transition-colors hover:bg-white/10 hover:text-[#C9A27E]"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {sections.map((section) => {
            if ("items" in section) {
              const navSection = section as NavSection;
              const expanded = expandedSections.includes(navSection.label);
              const sectionActive = isSectionActive(navSection);

              return (
                <div key={navSection.label}>
                  <button
                    onClick={() => toggleSection(navSection.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-all",
                      sectionActive
                        ? "text-[#C9A27E]"
                        : "text-[#F8F5F2]/60 hover:text-[#F8F5F2]"
                    )}
                  >
                    <navSection.icon size={20} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{navSection.label}</span>
                        <motion.span
                          animate={{ rotate: expanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={14} />
                        </motion.span>
                      </>
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && !collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                          {navSection.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] transition-all",
                                isActive(item.href)
                                  ? "border-l-2 border-[#C9A27E] bg-[#C9A27E]/10 pl-[10px] text-[#C9A27E]"
                                  : "text-[#F8F5F2]/50 hover:bg-white/5 hover:text-[#F8F5F2]"
                              )}
                            >
                              <item.icon size={16} />
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const item = section as NavItemSingle;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-l-2 border-[#C9A27E] bg-[#C9A27E]/10 pl-[10px] text-[#C9A27E]"
                    : "text-[#F8F5F2]/60 hover:bg-white/5 hover:text-[#F8F5F2]"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2.5",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A27E]/20 text-sm font-semibold text-[#C9A27E]">
            {user?.name?.charAt(0) || "H"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#F8F5F2]">
                {user?.name || "Admin"}
              </p>
              <span className="inline-block rounded-full bg-[#C9A27E]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#C9A27E]">
                {user?.role || "Admin"}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout(queryClient)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[#F8F5F2]/40 transition-colors hover:bg-white/5 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}