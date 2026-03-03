import React from "react";
import { LayoutDashboard, Package, Activity, LogOut, ShoppingCart } from "lucide-react";
import { cn } from "../lib/utils";

export function Sidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
}: {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff"] },
    { id: "pos", label: "Point of Sale", icon: ShoppingCart, roles: ["admin", "staff"] },
    { id: "products", label: "Products", icon: Package, roles: ["admin", "staff"] },
    { id: "logs", label: "Audit Logs", icon: Activity, roles: ["admin"] },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <Package className="h-6 w-6" />
          <span>B2B Admin</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">{user.username}</span>
            <span className="text-xs text-slate-500 capitalize">{user.role}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
