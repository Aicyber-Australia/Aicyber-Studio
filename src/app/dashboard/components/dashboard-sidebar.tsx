"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FolderKanban,
  Plus,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    icon: <Home className="h-5 w-5" />,
    label: "Home",
    href: "/dashboard",
  },
  {
    icon: <FolderKanban className="h-5 w-5" />,
    label: "Projects",
    href: "/workflow",
  },
];

const bottomItems: SidebarItem[] = [
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    href: "/settings",
  },
  {
    icon: <HelpCircle className="h-5 w-5" />,
    label: "Help",
    href: "/help",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white border-r border-zinc-200 z-20 flex flex-col"
      >
        {/* Create Button */}
        <div className="p-4">
          <Button
            asChild
            className={cn(
              "w-full gap-2 bg-black hover:bg-zinc-800 text-white h-10",
              isCollapsed ? "justify-center px-0" : "justify-center"
            )}
          >
            <Link href="/workflow">
              <Plus className="h-4 w-4 shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium overflow-hidden whitespace-nowrap"
                  >
                    New Project
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </Button>
        </div>

        <Separator className="bg-zinc-200" />

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-zinc-100 text-black"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-black",
                  isCollapsed && "justify-center"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-zinc-200" />

        {/* Bottom Items */}
        <div className="px-3 py-4 space-y-1">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-zinc-100 text-black"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-black",
                  isCollapsed && "justify-center"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center hover:bg-zinc-100 transition-colors z-30"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-zinc-600" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-zinc-600" />
          )}
        </button>
      </motion.aside>

      {/* Spacer to prevent content from going under sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
    </>
  );
}
