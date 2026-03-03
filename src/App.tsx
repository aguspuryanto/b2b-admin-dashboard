/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Products } from "./components/Products";
import { AuditLogs } from "./components/AuditLogs";
import { POS } from "./components/POS";
import { Bell } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications((prev) => [data, ...prev]);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-4 right-8 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50"
            >
              <Bell size={20} className="text-slate-600" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No new notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notif, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50">
                          <p className="text-sm text-slate-800">{notif.message}</p>
                          <p className="mt-1 text-xs text-slate-500">Just now</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {activeTab === "dashboard" && <Dashboard token={token} />}
        {activeTab === "pos" && <POS token={token} user={user} />}
        {activeTab === "products" && <Products token={token} user={user} />}
        {activeTab === "logs" && user.role === "admin" && <AuditLogs token={token} />}
      </div>
    </div>
  );
}

