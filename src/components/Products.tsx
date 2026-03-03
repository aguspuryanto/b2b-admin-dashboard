import React, { useState, useEffect } from "react";
import { Search, Plus, Download, Upload, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Settings2 } from "lucide-react";
import { cn } from "../lib/utils";

export function Products({ token, user }: { token: string; user: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("id");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(false);

  // Column Config State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    barcode: true,
    name: true,
    category: true,
    price: true,
    stock: true,
    status: true,
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({ barcode: "", name: "", category: "", price: 0, stock: 0, status: "active" });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?page=${page}&limit=${limit}&search=${search}&sort=${sort}&order=${order}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProducts(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit, search, sort, order]);

  const handleSort = (column: string) => {
    if (sort === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(column);
      setOrder("asc");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    window.open("/api/products/export?token=" + token, "_blank");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch("/api/products/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode || "",
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        status: product.status,
      });
    } else {
      setEditingProduct(null);
      setFormData({ barcode: "", name: "", category: "", price: 0, stock: 0, status: "active" });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Manage your product inventory</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === "admin" && (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload size={16} />
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
              </label>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Settings2 size={16} />
              Columns
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-10">
                {Object.keys(visibleColumns).map((col) => (
                  <label key={col} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 capitalize">{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["id", "barcode", "name", "category", "price", "stock", "status"].map((col) => (
                  visibleColumns[col] && (
                    <th
                      key={col}
                      className="cursor-pointer px-6 py-3 font-medium hover:bg-slate-100"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        {col}
                        <ArrowUpDown size={14} className="text-slate-400" />
                      </div>
                    </th>
                  )
                ))}
                {user.role === "admin" && <th className="px-6 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No products found.</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    {visibleColumns.id && <td className="px-6 py-4">{product.id}</td>}
                    {visibleColumns.barcode && <td className="px-6 py-4">{product.barcode || "-"}</td>}
                    {visibleColumns.name && <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>}
                    {visibleColumns.category && <td className="px-6 py-4">{product.category}</td>}
                    {visibleColumns.price && <td className="px-6 py-4">${product.price.toFixed(2)}</td>}
                    {visibleColumns.stock && <td className="px-6 py-4">{product.stock}</td>}
                    {visibleColumns.status && (
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            product.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {product.status}
                        </span>
                      </td>
                    )}
                    {user.role === "admin" && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(product)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-medium">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-medium">{total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Barcode</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Scan or enter barcode"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
