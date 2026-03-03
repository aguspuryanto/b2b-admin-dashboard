import React, { useState, useEffect } from "react";
import { Users, Package, Activity, DollarSign } from "lucide-react";

export function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalValue: 0,
    recentLogs: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/products?limit=1000", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const products = data.data;

        setStats({
          totalProducts: products.length,
          activeProducts: products.filter((p: any) => p.status === "active").length,
          totalValue: products.reduce((acc: number, p: any) => acc + p.price * p.stock, 0),
          recentLogs: 12, // Mocked for dashboard
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [token]);

  const statCards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "bg-blue-50 text-blue-600" },
    { label: "Active Products", value: stats.activeProducts, icon: Activity, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Inventory Value", value: `$${stats.totalValue.toFixed(2)}`, icon: DollarSign, color: "bg-indigo-50 text-indigo-600" },
    { label: "Recent Activities", value: stats.recentLogs, icon: Users, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">Welcome back to the B2B Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">System Status</h2>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          All systems operational
        </div>
      </div>
    </div>
  );
}
