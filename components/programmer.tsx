"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  npm: number;
  nama: string;
  no_hp: string | null;
  bidang: string | null;
  region: string | null;
  created_at: string | null;
};

type AuthUser = { id: number; username: string; email: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function readStoredUser(): AuthUser | null {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (!raw) return null;
    const obj: unknown = JSON.parse(raw);
    if (
      isObject(obj) &&
      typeof obj.id === "number" &&
      typeof obj.username === "string" &&
      typeof obj.email === "string"
    ) {
      return { id: obj.id, username: obj.username, email: obj.email };
    }
    return null;
  } catch {
    return null;
  }
}

export default function Programmers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("");

  const [user, setUser] = useState<AuthUser | null>(null);
  const isLoggedIn = !!user;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    npm: "",
    nama: "",
    no_hp: "",
    bidang: "",
    region: "",
  });
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editKey, setEditKey] = useState<number | null>(null);
  const [errEdit, setErrEdit] = useState<string | null>(null);

  const [confirmDel, setConfirmDel] = useState<{
    npm: number;
    nama: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    setUser(readStoredUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_user") setUser(readStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(search?: string, bidang?: string) {
    setLoading(true);

    let query = supabase
      .from("programmer")
      .select("npm,nama,no_hp,bidang,region,created_at")
      .order("nama", { ascending: true });

    if (search && search.trim() !== "") {
      query = query.or(
        `nama.ilike.%${search}%,no_hp.ilike.%${search}%,bidang.ilike.%${search}%,region.ilike.%${search}%`
      );
    }
    if (bidang) query = query.eq("bidang", bidang);

    const { data, error } = await query;
    if (error) {
      console.error("[supabase] select programmer:", error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQ(v);
    fetchData(v, spec);
  }
  function onSpec(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setSpec(v);
    fetchData(q, v);
  }

  const bidangOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.bidang).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [rows]);

  function exportCSV() {
    const headers = ["NPM", "Nama", "Bidang", "No HP", "Region", "Created At"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.npm,
          csvSafe(r.nama),
          csvSafe(r.bidang ?? ""),
          csvSafe(r.no_hp ?? ""),
          csvSafe(r.region ?? ""),
          r.created_at ?? "",
        ].join(",")
      ),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    a.download = "programmer.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveProgrammer(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setErrMsg("Silahkan Masuk Terlebih Dahulu!");
      return;
    }
    setErrMsg(null);
    if (!form.npm || isNaN(Number(form.npm)))
      return setErrMsg("NPM wajib angka.");
    if (!form.nama.trim()) return setErrMsg("Nama wajib diisi.");

    setSaving(true);
    const { error } = await supabase.from("programmer").insert([
      {
        npm: Number(form.npm),
        nama: form.nama.trim(),
        no_hp: form.no_hp?.trim() || null,
        bidang: form.bidang?.trim() || null,
        region: form.region?.trim() || null,
      },
    ]);
    setSaving(false);

    if (error) {
      setErrMsg(error.message);
      return;
    }

    setOpen(false);
    setForm({ npm: "", nama: "", no_hp: "", bidang: "", region: "" });
    await fetchData(q, spec);
  }

  function startEdit(r: Row) {
    if (!isLoggedIn) {
      alert("Silahkan Masuk Terlebih Dahulu!");
      return;
    }
    setEditKey(r.npm);
    setErrEdit(null);
    setForm({
      npm: String(r.npm),
      nama: r.nama ?? "",
      no_hp: r.no_hp ?? "",
      bidang: r.bidang ?? "",
      region: r.region ?? "",
    });
    setOpenEdit(true);
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setErrEdit("Silahkan Masuk Terlebih Dahulu!");
      return;
    }
    setErrEdit(null);
    if (editKey == null) return;
    if (!form.npm || isNaN(Number(form.npm)))
      return setErrEdit("NPM wajib angka.");
    if (!form.nama.trim()) return setErrEdit("Nama wajib diisi.");
    setSavingEdit(true);
    const { error } = await supabase
      .from("programmer")
      .update({
        npm: Number(form.npm),
        nama: form.nama.trim(),
        no_hp: form.no_hp?.trim() || null,
        bidang: form.bidang?.trim() || null,
        region: form.region?.trim() || null,
      })
      .eq("npm", editKey);
    setSavingEdit(false);
    if (error) {
      setErrEdit(error.message);
      return;
    }
    setOpenEdit(false);
    setForm({ npm: "", nama: "", no_hp: "", bidang: "", region: "" });
    setEditKey(null);
    await fetchData(q, spec);
  }

  function askDelete(r: Row) {
    if (!isLoggedIn) {
      alert("Silahkan Masuk Terlebih Dahulu!");
      return;
    }
    setConfirmDel({ npm: r.npm, nama: r.nama });
  }

  async function doDelete() {
    if (!confirmDel) return;
    if (!isLoggedIn) return;
    setDeleting(true);

    const { error } = await supabase
      .from("programmer")
      .delete()
      .eq("npm", confirmDel.npm);

    setDeleting(false);
    setConfirmDel(null);

    if (!error) await fetchData(q, spec);
  }

  return (
    <section className="mx-auto max-w-6xl p-4">
      <div className="mb-6 flex items-center justify-left py-8">
        <h1 className="text-2xl font-bold text-gray-800">Data Programmer</h1>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (!localStorage.getItem("auth_user")) {
              alert("Silahkan Masuk Terlebih Dahulu!");
              return;
            }
            setForm({ npm: "", nama: "", no_hp: "", bidang: "", region: "" });
            setErrMsg(null);
            setOpen(true);
          }}
        >
          Tambah Programmer
        </button>

        <button
          className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-800 font-medium hover:bg-gray-300"
          type="button"
          onClick={exportCSV}
        >
          Ekspor ke CSV
        </button>

        <div className="mt-2 w-full rounded-lg bg-gray-100 px-4 py-2 sm:mt-0 sm:max-w-md">
          <input
            value={q}
            onChange={onSearch}
            placeholder="Cari nama, bidang, region, atau no HP…"
            className="w-full bg-transparent text-sm text-gray-700 outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={spec}
            onChange={onSpec}
            className="appearance-none rounded-md border border-gray-200 bg-white px-6 py-2 text-sm text-gray-700"
          >
            <option value="">Semua Bidang</option>
            {bidangOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
            ▾
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>NPM</Th>
              <Th>Nama</Th>
              <Th>Bidang</Th>
              <Th>No. HP</Th>
              <Th>Region</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-gray-500">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.npm}>
                  <td className="px-4 py-4 text-sm text-gray-900">{r.npm}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{r.nama}</td>
                  <td className="px-4 py-4 text-sm text-blue-600">
                    {r.bidang ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {r.no_hp ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {r.region ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-right text-sm">
                    <button
                      className="text-blue-600 hover:underline mr-3"
                      onClick={() => {
                        if (!localStorage.getItem("auth_user")) {
                          alert("Silahkan Masuk Terlebih Dahulu!");
                          return;
                        }
                        startEdit(r);
                      }}
                    >
                      Ubah
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        if (!localStorage.getItem("auth_user")) {
                          alert("Silahkan Masuk Terlebih Dahulu!");
                          return;
                        }
                        askDelete(r);
                      }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 text-gray-800">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tambah Programmer</h2>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {errMsg && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errMsg}
              </div>
            )}

            <form onSubmit={saveProgrammer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    NPM
                  </label>
                  <input
                    value={form.npm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, npm: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nama
                  </label>
                  <input
                    value={form.nama}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nama: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                    placeholder="Nama lengkap"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Bidang
                  </label>
                  <input
                    value={form.bidang}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bidang: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                    placeholder="misal: Website Development"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Region
                  </label>
                  <input
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                    placeholder="misal: Jakarta"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  No. HP
                </label>
                <input
                  value={form.no_hp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, no_hp: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                  onClick={() => setOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openEdit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 text-gray-800">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ubah Programmer</h2>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpenEdit(false)}
              >
                ✕
              </button>
            </div>

            {errEdit && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errEdit}
              </div>
            )}

            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    NPM
                  </label>
                  <input
                    value={form.npm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, npm: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nama
                  </label>
                  <input
                    value={form.nama}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nama: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Bidang
                  </label>
                  <input
                    value={form.bidang}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bidang: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Region
                  </label>
                  <input
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  No. HP
                </label>
                <input
                  value={form.no_hp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, no_hp: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                  onClick={() => setOpenEdit(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {savingEdit ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg text-gray-800">
            <h3 className="text-base font-semibold mb-3">Hapus Programmer</h3>
            <p className="text-sm text-gray-700 mb-4">
              Yakin menghapus{" "}
              <span className="font-semibold">{confirmDel.nama}</span> (NPM{" "}
              {confirmDel.npm})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                onClick={() => setConfirmDel(null)}
              >
                Batal
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={doDelete}
              >
                {deleting ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 ${className}`}
    >
      {children}
    </th>
  );
}
function csvSafe(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
