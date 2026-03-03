import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, CreditCard, Wallet, Banknote, Trash2, Plus, Minus, Wifi, WifiOff } from "lucide-react";
import { cn } from "../lib/utils";

export function POS({ token, user }: { token: string; user: any }) {
  const [shift, setShift] = useState<any>(null);
  const [startingCash, setStartingCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftAction, setShiftAction] = useState<"start" | "end">("start");

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(JSON.parse(localStorage.getItem("offline_txs") || "[]"));

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineTransactions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch shift and products on load
  useEffect(() => {
    fetchCurrentShift();
    fetchAllProducts();
  }, []);

  const fetchCurrentShift = async () => {
    try {
      const res = await fetch("/api/shifts/current", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setShift(data);
    } catch (err) {
      console.error("Failed to fetch shift", err);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await fetch("/api/products?all=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProducts(data.data);
      localStorage.setItem("offline_products", JSON.stringify(data.data));
    } catch (err) {
      console.error("Failed to fetch products, using offline cache", err);
      const cached = localStorage.getItem("offline_products");
      if (cached) setProducts(JSON.parse(cached));
    }
  };

  const handleShiftAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (shiftAction === "start") {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ starting_cash: startingCash }),
        });
        if (res.ok) {
          fetchCurrentShift();
          setIsShiftModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/shifts/${shift.id}/end`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ending_cash: endingCash }),
        });
        if (res.ok) {
          setShift(null);
          setIsShiftModalOpen(false);
        }
      }
    } catch (err) {
      console.error("Shift action failed", err);
    }
  };

  const syncOfflineTransactions = async () => {
    const queue = JSON.parse(localStorage.getItem("offline_txs") || "[]");
    if (queue.length === 0) return;

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shift_id: shift?.id, transactions: queue }),
      });
      
      if (res.ok) {
        localStorage.removeItem("offline_txs");
        setOfflineQueue([]);
        fetchAllProducts(); // Refresh stock
      }
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;

    const product = products.find(p => p.barcode === barcodeInput || p.id.toString() === barcodeInput);
    if (product) {
      addToCart(product);
    } else {
      alert("Product not found!");
    }
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayment = async () => {
    if (cart.length === 0) return;

    const transaction = {
      total_amount: totalAmount,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    if (isOnline) {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ shift_id: shift?.id, transactions: [transaction] }),
        });
        if (res.ok) {
          setCart([]);
          setIsPaymentModalOpen(false);
          fetchAllProducts(); // Refresh stock
        }
      } catch (err) {
        console.error("Transaction failed", err);
        saveOffline(transaction);
      }
    } else {
      saveOffline(transaction);
    }
  };

  const saveOffline = (transaction: any) => {
    const newQueue = [...offlineQueue, transaction];
    setOfflineQueue(newQueue);
    localStorage.setItem("offline_txs", JSON.stringify(newQueue));
    setCart([]);
    setIsPaymentModalOpen(false);
    alert("Saved offline. Will sync when connection is restored.");
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchQuery))
  );

  if (!shift) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Wallet size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">Start Your Shift</h2>
          <p className="mb-8 text-slate-500">You need to open a shift before using the POS.</p>
          <button
            onClick={() => { setShiftAction("start"); setIsShiftModalOpen(true); }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Open Shift
          </button>
        </div>

        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Open Shift</h2>
              <form onSubmit={handleShiftAction} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Starting Cash Drawer Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={startingCash}
                    onChange={(e) => setStartingCash(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Start Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Point of Sale</h1>
          <div className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Online" : "Offline Mode"}
          </div>
          {offlineQueue.length > 0 && (
            <span className="text-xs font-medium text-amber-600">
              {offlineQueue.length} pending sync
            </span>
          )}
        </div>
        <button
          onClick={() => { setShiftAction("end"); setIsShiftModalOpen(true); }}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          End Shift
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products & Scanner */}
        <div className="flex flex-1 flex-col border-r border-slate-200 bg-slate-50 p-6">
          <div className="mb-6 flex gap-4">
            <form onSubmit={handleBarcodeSubmit} className="flex-1">
              <div className="relative">
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full rounded-xl border-2 border-indigo-200 bg-white py-3 pl-4 pr-12 text-lg shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-indigo-100 p-1 text-indigo-600">
                  <Search size={20} />
                </div>
              </div>
            </form>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                >
                  <span className="mb-2 text-sm font-medium text-slate-900 line-clamp-2">{product.name}</span>
                  <div className="mt-auto flex w-full items-center justify-between">
                    <span className="font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-500">Stock: {product.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="flex w-96 flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <ShoppingCart className="text-slate-500" />
            <h2 className="font-bold text-slate-900">Current Order</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan a barcode to add items</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 shadow-sm">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-900">{item.name}</h4>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-600">${item.price.toFixed(2)}</span>
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-500 hover:text-slate-900"><Minus size={14} /></button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-500 hover:text-slate-900"><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <span className="font-bold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center justify-between text-lg font-bold text-slate-900">
              <span>Total</span>
              <span className="text-2xl text-indigo-600">${totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Pay Now
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Payment</h2>
            
            <div className="mb-6 rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Total Amount Due</p>
              <p className="text-4xl font-bold text-indigo-600">${totalAmount.toFixed(2)}</p>
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", paymentMethod === "cash" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-indigo-200")}
                >
                  <Banknote size={24} />
                  <span className="text-sm font-medium">Cash</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", paymentMethod === "card" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-indigo-200")}
                >
                  <CreditCard size={24} />
                  <span className="text-sm font-medium">Card</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("qris")}
                  className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all", paymentMethod === "qris" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-indigo-200")}
                >
                  <Wallet size={24} />
                  <span className="text-sm font-medium">QRIS</span>
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="rounded-lg bg-indigo-600 px-8 py-3 font-bold text-white hover:bg-indigo-700"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Modal */}
      {isShiftModalOpen && shiftAction === "end" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">End Shift</h2>
            <form onSubmit={handleShiftAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ending Cash Drawer Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={endingCash}
                  onChange={(e) => setEndingCash(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
