import { LayoutDashboard } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  resource: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};