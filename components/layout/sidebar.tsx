"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/common";

interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: string;
  empresaId?: number | null;
}

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [saindo, setSaindo] = useState(false);

  // Guarda quais grupos estão abertos.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const usuarioSalvo = sessionStorage.getItem("mh3_usuario");

      if (usuarioSalvo) {
        setUsuario(JSON.parse(usuarioSalvo));
      }

      const sidebarSalva = localStorage.getItem("mh3_sidebar_collapsed");

      if (sidebarSalva === "true") {
        setCollapsed(true);
      }

      const gruposSalvos = localStorage.getItem("mh3_sidebar_groups");

      if (gruposSalvos) {
        setOpenGroups(JSON.parse(gruposSalvos));
      }
    } catch (error) {
      console.error("Erro ao carregar preferências da sidebar:", error);
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((estadoAtual) => {
      const novoEstado = !estadoAtual;

      try {
        localStorage.setItem("mh3_sidebar_collapsed", String(novoEstado));
      } catch (error) {
        console.error("Erro ao salvar estado da sidebar:", error);
      }

      return novoEstado;
    });
  }

  function toggleGroup(groupLabel: string) {
    setOpenGroups((estadoAtual) => {
      const novoEstado = {
        ...estadoAtual,
        [groupLabel]: !estadoAtual[groupLabel],
      };

      try {
        localStorage.setItem("mh3_sidebar_groups", JSON.stringify(novoEstado));
      } catch (error) {
        console.error("Erro ao salvar estado dos grupos:", error);
      }

      return novoEstado;
    });
  }

  function isGroupActive(group: NavGroup) {
    return group.items.some((item) => {
      if (item.href === "/") {
        return pathname === "/";
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
  }

  async function handleLogout() {
    if (saindo) return;

    try {
      setSaindo(true);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
    } finally {
      sessionStorage.removeItem("mh3_token");
      sessionStorage.removeItem("mh3_usuario");

      router.replace("/login");
      router.refresh();
    }
  }

  const nomeUsuario = usuario?.nome || usuario?.login || "Usuário";
  const perfilUsuario = usuario?.perfil || "Usuário";

  const iniciais = nomeUsuario
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-300",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Cabeçalho */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/placeholder-logo.png"
              alt="MH3 Rental"
              className="h-full w-full object-contain"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                MH3 Rental
              </p>

              <p className="truncate text-xs text-muted-foreground">
                Gestão de locadoras
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden ">
            <img
              src="/icon-dark-32x32.png"
              alt="MH3 Rental"
              className="h-full w-full object-contain"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              collapsed ? "Maximizar barra lateral" : "Minimizar barra lateral"
            }
            title={
              collapsed ? "Maximizar barra lateral" : "Minimizar barra lateral"
            }
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "absolute left-[52px]",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {navGroups.map((group) => {
          const grupo = group as NavGroup;
          const grupoAtivo = isGroupActive(grupo);

          // Quando não houver preferência salva, grupos ativos ficam abertos.
          const isOpen = openGroups[grupo.label] ?? grupoAtivo;

          return (
            <div key={grupo.label} className="mb-4">
              {!collapsed ? (
                <>
                  {/* Cabeçalho clicável do grupo */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(grupo.label)}
                    className={cn(
                      "mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider transition-colors",
                      grupoAtivo
                        ? "text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{grupo.label}</span>

                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        !isOpen && "-rotate-90",
                      )}
                    />
                  </button>

                  {/* Opções do grupo */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200",
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <ul className="space-y-1 px-2">
                        {grupo.items.map((item) => {
                          const Icon = item.icon;

                          const isActive =
                            item.href === "/"
                              ? pathname === "/"
                              : pathname === item.href ||
                                pathname.startsWith(`${item.href}/`);

                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                  "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <Icon className="h-[18px] w-[18px] shrink-0" />

                                <span className="truncate">{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                /* Sidebar minimizada: mostra somente os ícones */
                <ul className="space-y-1 px-2">
                  {grupo.items.map((item) => {
                    const Icon = item.icon;

                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          title={item.label}
                          aria-label={item.label}
                          className={cn(
                            "group relative flex min-h-10 items-center justify-center rounded-lg transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />

                          <span className="pointer-events-none absolute left-[62px] z-50 hidden whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg group-hover:block">
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Usuário e logout */}
      <div className="shrink-0 border-t border-border p-2">
        {!collapsed ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {iniciais || <User className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {nomeUsuario}
              </p>

              <p className="truncate text-[10px] text-muted-foreground">
                {perfilUsuario}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex justify-center">
            <div
              title={nomeUsuario}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            >
              {iniciais || <User className="h-4 w-4" />}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={saindo}
          title={collapsed ? "Sair" : undefined}
          aria-label="Sair"
          className={cn(
            "flex min-h-10 w-full items-center rounded-lg text-sm text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />

          {!collapsed && <span>{saindo ? "Saindo..." : "Sair"}</span>}
        </button>
      </div>
    </aside>
  );
}
