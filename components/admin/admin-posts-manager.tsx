"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Filter,
  AlertTriangle,
} from "lucide-react";

interface Opportunity {
  id: string;
  type: "tender" | "poticaj";
  slug: string;
  title: string;
  issuer: string;
  category: string | null;
  subcategory: string | null;
  industry: string | null;
  value: number | null;
  deadline: string | null;
  location: string | null;
  requirements: string | null;
  eligibility_signals: string[] | null;
  description: string | null;
  source_url: string;
  status: "active" | "expired" | "draft";
  seo_title: string | null;
  seo_description: string | null;
  ai_summary: string | null;
  ai_who_should_apply: string | null;
  ai_difficulty: "lako" | "srednje" | "tesko" | null;
  ai_risks: string | null;
  ai_competition: string | null;
  quality_score: number;
  published: boolean;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminPostsManager() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const limit = 25;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/admin/opportunities?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOpportunities(data.opportunities);
        setTotal(data.total);
      }
    } catch {
      showToast("Greška pri učitavanju", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleEdit = (opp: Opportunity) => {
    setEditingId(opp.id);
    setEditForm({ ...opp });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/opportunities/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        showToast("Spremljeno", "success");
        setEditingId(null);
        fetchOpportunities();
      } else {
        const data = await res.json();
        showToast(data.error || "Greška", "error");
      }
    } catch {
      showToast("Greška pri spremanju", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj post?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/opportunities/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Obrisano", "success");
        fetchOpportunities();
      } else {
        const data = await res.json();
        showToast(data.error || "Greška", "error");
      }
    } catch {
      showToast("Greška pri brisanju", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (opp: Opportunity) => {
    try {
      const res = await fetch(`/api/admin/opportunities/${opp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !opp.published }),
      });
      if (res.ok) {
        showToast(opp.published ? "Sakriveno" : "Objavljeno", "success");
        fetchOpportunities();
      }
    } catch {
      showToast("Greška", "error");
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm("OPREZ: Ovo će obrisati SVE postove, zakone i logove. Jeste li sigurni?")) return;
    if (!confirm("Potvrdite još jednom: Brisanje SVIH podataka za čisti re-scrape?")) return;
    setPurging(true);
    try {
      const res = await fetch("/api/admin/purge-posts", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Obrisano: ${data.deleted?.opportunities ?? 0} postova, ${data.deleted?.legal_updates ?? 0} zakona`, "success");
        fetchOpportunities();
      } else {
        showToast(data.error || "Greška pri brisanju", "error");
      }
    } catch {
      showToast("Greška pri brisanju", "error");
    } finally {
      setPurging(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
            Upravljanje postovima
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Pregledajte, uređujte i brišite sve prilike i poticaje. Ukupno: {total}
          </p>
        </div>
        <button
          onClick={handlePurgeAll}
          disabled={purging}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {purging ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
          Obriši sve za re-scrape
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pretraži po naslovu..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Svi statusi</option>
            <option value="active">Aktivno</option>
            <option value="expired">Isteklo</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Svi tipovi</option>
            <option value="poticaj">Poticaj</option>
            <option value="tender">Tender</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            Nema rezultata.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Naslov</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[100px]">Tip</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[100px]">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[80px]">Score</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[100px]">Objavljeno</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[120px]">Datum</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[160px]">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="max-w-[400px]">
                        <p className="text-sm font-medium text-slate-900 truncate">{opp.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{opp.issuer}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        opp.type === "poticaj" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {opp.type === "poticaj" ? "Poticaj" : "Tender"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        opp.status === "active" ? "bg-emerald-100 text-emerald-800" :
                        opp.status === "expired" ? "bg-red-100 text-red-800" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {opp.status === "active" ? "Aktivno" : opp.status === "expired" ? "Isteklo" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{opp.quality_score}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublish(opp)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full cursor-pointer transition-colors ${
                          opp.published
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {opp.published ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {opp.published ? "Da" : "Ne"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(opp.created_at).toLocaleDateString("bs-BA")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {opp.source_url && (
                          <a
                            href={opp.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Otvori izvor"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleEdit(opp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Uredi"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(opp.id)}
                          disabled={deleting === opp.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Obriši"
                        >
                          {deleting === opp.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Stranica {page} od {totalPages} ({total} ukupno)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-slate-900">Uredi post</h2>
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Naslov</label>
                <input
                  type="text"
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              {/* Issuer + Category row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Izdavač</label>
                  <input
                    type="text"
                    value={editForm.issuer ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, issuer: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Kategorija</label>
                  <input
                    type="text"
                    value={editForm.category ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Opis</label>
                <textarea
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value || null })}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Uvjeti / Zahtjevi</label>
                <textarea
                  value={editForm.requirements ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value || null })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                />
              </div>

              {/* Value + Deadline + Location row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Vrijednost (KM)</label>
                  <input
                    type="number"
                    value={editForm.value ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Rok prijave</label>
                  <input
                    type="date"
                    lang="bs-BA"
                    value={editForm.deadline ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Lokacija</label>
                  <input
                    type="text"
                    value={editForm.location ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Izvorni URL</label>
                <input
                  type="url"
                  value={editForm.source_url ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              {/* Type + Status + Published row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tip</label>
                  <select
                    value={editForm.type ?? "poticaj"}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "tender" | "poticaj" })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="poticaj">Poticaj</option>
                    <option value="tender">Tender</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editForm.status ?? "active"}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "active" | "expired" | "draft" })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="active">Aktivno</option>
                    <option value="expired">Isteklo</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Objavljeno</label>
                  <select
                    value={editForm.published ? "true" : "false"}
                    onChange={(e) => setEditForm({ ...editForm, published: e.target.value === "true" })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="true">Da</option>
                    <option value="false">Ne</option>
                  </select>
                </div>
              </div>

              {/* SEO section */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">SEO</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">SEO naslov</label>
                    <input
                      type="text"
                      value={editForm.seo_title ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, seo_title: e.target.value || null })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">SEO opis</label>
                    <textarea
                      value={editForm.seo_description ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, seo_description: e.target.value || null })}
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* AI section */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Automatski sadržaj</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sažetak</label>
                    <textarea
                      value={editForm.ai_summary ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, ai_summary: e.target.value || null })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tko se može prijaviti</label>
                    <textarea
                      value={editForm.ai_who_should_apply ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, ai_who_should_apply: e.target.value || null })}
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Težina</label>
                      <select
                        value={editForm.ai_difficulty ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, ai_difficulty: (e.target.value || null) as "lako" | "srednje" | "tesko" | null })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      >
                        <option value="">Neodređeno</option>
                        <option value="lako">Lako</option>
                        <option value="srednje">Srednje</option>
                        <option value="tesko">Teško</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Rizici</label>
                      <input
                        type="text"
                        value={editForm.ai_risks ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, ai_risks: e.target.value || null })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Konkurencija</label>
                      <input
                        type="text"
                        value={editForm.ai_competition ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, ai_competition: e.target.value || null })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Odustani
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Spremi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
