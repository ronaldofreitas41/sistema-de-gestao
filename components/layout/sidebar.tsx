"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Contact,
  Clock1,
  X,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/common";
// import { clearSession } from "@/lib/auth";


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}


export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Pega CPF e Corban do localStorage
  const cpf = typeof window !== "undefined"
    ? localStorage.getItem("user_cpf") ?? "-"
    : "-";

  const selectedCorban = typeof window !== "undefined"
    ? localStorage.getItem("selected_corban")
    : null;

  const initials = cpf !== "-" ? cpf.slice(0, 2).toUpperCase() : "CH";

  // const handleLogout = () => {
  //   clearSession();
  //   router.replace("/login");
  // };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r transition-all duration-300",
        "bg-[hsl(var(--sidebar-background))]",
        collapsed ? "w-16" : "w-[82vw] max-w-[260px] md:w-60"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">CH</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">ConsigHub</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">CH</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))]/60 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] transition-colors md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))]/60 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] transition-colors",
              collapsed && "mx-auto mt-1"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-foreground))]/40">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
                          : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]",
                        collapsed && "justify-center"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[hsl(var(--sidebar-foreground))]">
                {cpf}
              </p>
              {selectedCorban && (
                <p className="truncate text-[10px] text-[hsl(var(--sidebar-foreground))]/50">
                  Corban: {selectedCorban}
                </p>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Sair"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}