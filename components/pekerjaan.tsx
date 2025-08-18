"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = "todo" | "inprogress" | "done";
type Prioritas = "Rendah" | "Sedang" | "Tinggi";

type Task = {
  id: number;
  judul: string;
  tenggat: string | null;
  prioritas: Prioritas;
  bagian: string | null;
  status: Status;
};

type AuthUser = { id: number; username: string; email: string };
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isTask(x: unknown): x is Task {
  if (!isObject(x)) return false;
  const id = (x as Record<string, unknown>)["id"];
  const judul = (x as Record<string, unknown>)["judul"];
  const tenggat = (x as Record<string, unknown>)["tenggat"];
  const prioritas = (x as Record<string, unknown>)["prioritas"];
  const bagian = (x as Record<string, unknown>)["bagian"];
  const status = (x as Record<string, unknown>)["status"];

  const priorOk =
    prioritas === "Rendah" || prioritas === "Sedang" || prioritas === "Tinggi";
  const statusOk =
    status === "todo" || status === "inprogress" || status === "done";

  return (
    typeof id === "number" &&
    typeof judul === "string" &&
    (typeof tenggat === "string" ||
      tenggat === null ||
      typeof tenggat === "undefined") &&
    priorOk &&
    (typeof bagian === "string" ||
      bagian === null ||
      typeof bagian === "undefined") &&
    statusOk
  );
}

function readUser(): AuthUser | null {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (!raw) return null;
    const j: unknown = JSON.parse(raw);
    if (
      isObject(j) &&
      typeof j.id === "number" &&
      typeof j.username === "string" &&
      typeof j.email === "string"
    ) {
      return { id: j.id, username: j.username, email: j.email };
    }
    return null;
  } catch {
    return null;
  }
}

function mustLogin(): boolean {
  const ok = !!readUser();
  if (!ok) alert("Silahkan Masuk Terlebih Dahulu!");
  return !ok;
}

export default function PekerjaanPage() {
  const [tab, setTab] = useState<"all" | "inprogress" | "done">("all");
  const [sortBy, setSortBy] = useState<"none" | "priority" | "deadline">(
    "none"
  );

  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Tambah
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    judul: string;
    tenggat: string;
    prioritas: Prioritas;
    bagian: string;
  }>({ judul: "", tenggat: "", prioritas: "Sedang", bagian: "" });

  // Edit
  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    judul: string;
    tenggat: string;
    prioritas: Prioritas;
    bagian: string;
    status: Status;
  }>({
    judul: "",
    tenggat: "",
    prioritas: "Sedang",
    bagian: "",
    status: "todo",
  });

  useEffect(() => {
    void fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pekerjaan")
      .select("id, judul, tenggat, prioritas, bagian, status")
      .order("tenggat", { ascending: true });

    if (error) {
      console.error("[supabase] select pekerjaan:", error.message);
      setItems([]);
    } else {
      const raw: unknown = data;
      const arr: unknown[] = Array.isArray(raw) ? raw : [];
      const rows: Task[] = arr.filter(isTask);
      setItems(rows);
    }
    setLoading(false);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (mustLogin()) return;
    if (!form.judul.trim() || !form.tenggat) return;

    setSaving(true);
    const { error } = await supabase.from("pekerjaan").insert([
      {
        judul: form.judul.trim(),
        tenggat: form.tenggat,
        prioritas: form.prioritas,
        bagian: form.bagian.trim() || null,
        status: "todo" as Status,
      },
    ]);
    setSaving(false);

    if (error) {
      alert("Gagal menyimpan: " + error.message);
      return;
    }

    setOpen(false);
    setForm({ judul: "", tenggat: "", prioritas: "Sedang", bagian: "" });
    await fetchTasks();
  }

  function startEdit(t: Task) {
    if (mustLogin()) return;
    setEditId(t.id);
    setEditForm({
      judul: t.judul,
      tenggat: t.tenggat ?? "",
      prioritas: t.prioritas,
      bagian: t.bagian ?? "",
      status: t.status,
    });
    setOpenEdit(true);
  }

  async function updateTask(e: React.FormEvent) {
    e.preventDefault();
    if (mustLogin()) return;
    if (editId == null) return;
    if (!editForm.judul.trim() || !editForm.tenggat) return;

    setSavingEdit(true);
    const { error } = await supabase
      .from("pekerjaan")
      .update({
        judul: editForm.judul.trim(),
        tenggat: editForm.tenggat,
        prioritas: editForm.prioritas,
        bagian: editForm.bagian.trim() || null,
        status: editForm.status,
      })
      .eq("id", editId);
    setSavingEdit(false);

    if (error) {
      alert("Gagal mengubah: " + error.message);
      return;
    }

    setOpenEdit(false);
    setEditId(null);
    await fetchTasks();
  }

  async function toggleDone(id: number) {
    if (mustLogin()) return;
    const current = items.find((t) => t.id === id);
    if (!current) return;
    const next: Status = current.status === "done" ? "inprogress" : "done";

    const { error } = await supabase
      .from("pekerjaan")
      .update({ status: next })
      .eq("id", id);
    if (error) {
      alert("Gagal mengubah status: " + error.message);
      return;
    }
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t))
    );
  }

  async function removeTask(id: number) {
    if (mustLogin()) return;
    if (!confirm("Hapus tugas ini?")) return;

    const { error } = await supabase.from("pekerjaan").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  const filtered = useMemo(() => {
    let list = items;
    if (tab === "inprogress") list = items.filter((t) => t.status !== "done");
    if (tab === "done") list = items.filter((t) => t.status === "done");

    if (sortBy === "priority") {
      const order: Record<Prioritas, number> = {
        Tinggi: 0,
        Sedang: 1,
        Rendah: 2,
      };
      list = [...list].sort((a, b) => order[a.prioritas] - order[b.prioritas]);
    } else if (sortBy === "deadline") {
      list = [...list].sort((a, b) =>
        (a.tenggat ?? "").localeCompare(b.tenggat ?? "")
      );
    }
    return list;
  }, [items, tab, sortBy]);

  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of filtered) {
      const key = (t.bagian ?? "").trim() || "Umum";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <section className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex items-center justify-between py-8">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Pekerjaan</h1>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={() => {
            if (mustLogin()) return;
            setOpen(true);
          }}
        >
          Tugas Baru
        </button>
      </div>

      <div className="border-b">
        <div className="flex gap-6">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            Semua
          </Tab>
          <Tab
            active={tab === "inprogress"}
            onClick={() => setTab("inprogress")}
          >
            Berjalan
          </Tab>
          <Tab active={tab === "done"} onClick={() => setTab("done")}>
            Selesai
          </Tab>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Urut Berdasarkan
        </p>
        <div className="flex gap-2">
          <Chip
            active={sortBy === "priority"}
            onClick={() => setSortBy("priority")}
          >
            Prioritas
          </Chip>
          <Chip
            active={sortBy === "deadline"}
            onClick={() => setSortBy("deadline")}
          >
            Tenggat
          </Chip>
          <Chip active={sortBy === "none"} onClick={() => setSortBy("none")}>
            Default
          </Chip>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Memuat…</p>
      ) : groups.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Tidak ada pekerjaan.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map(([bagian, list]) => (
            <div key={bagian}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  <span className="text-gray-900">{bagian}</span>
                </h2>
                <span className="text-xs text-gray-500">
                  {list.length} tugas
                </span>
              </div>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {list.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 p-4">
                    <button
                      aria-label="toggle selesai"
                      className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                        t.status === "done"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-300 bg-white"
                      }`}
                      onClick={() => void toggleDone(t.id)}
                      title={
                        t.status === "done"
                          ? "Tandai belum selesai"
                          : "Tandai selesai"
                      }
                    >
                      {t.status === "done" ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          className="text-blue-600"
                        >
                          <path
                            fill="currentColor"
                            d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
                          />
                        </svg>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {t.judul}
                      </p>
                      <p className="text-xs text-gray-500">
                        Jatuh tempo: {t.tenggat ?? "-"}
                        {` • ${t.prioritas}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                        onClick={() => startEdit(t)}
                      >
                        Ubah
                      </button>
                      <button
                        className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => void removeTask(t.id)}
                      >
                        Hapus
                      </button>
                      <span className="text-gray-400">›</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl text-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tugas Baru</h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={createTask} className="space-y-3">
              <FieldText
                label="Judul"
                value={form.judul}
                onChange={(v) => setForm((f) => ({ ...f, judul: v }))}
                placeholder="Contoh: Implementasi fitur X"
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldDate
                  label="Tenggat"
                  value={form.tenggat}
                  onChange={(v) => setForm((f) => ({ ...f, tenggat: v }))}
                />
                <FieldSelect
                  label="Prioritas"
                  value={form.prioritas}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, prioritas: v as Prioritas }))
                  }
                  options={["Rendah", "Sedang", "Tinggi"]}
                />
              </div>
              <FieldText
                label="Bagian"
                value={form.bagian}
                onChange={(v) => setForm((f) => ({ ...f, bagian: v }))}
                placeholder="Contoh: Web Development, DevOps"
              />

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
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah */}
      {openEdit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl text-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ubah Tugas</h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setOpenEdit(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={updateTask} className="space-y-3">
              <FieldText
                label="Judul"
                value={editForm.judul}
                onChange={(v) => setEditForm((f) => ({ ...f, judul: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldDate
                  label="Tenggat"
                  value={editForm.tenggat}
                  onChange={(v) => setEditForm((f) => ({ ...f, tenggat: v }))}
                />
                <FieldSelect
                  label="Prioritas"
                  value={editForm.prioritas}
                  onChange={(v) =>
                    setEditForm((f) => ({ ...f, prioritas: v as Prioritas }))
                  }
                  options={["Rendah", "Sedang", "Tinggi"]}
                />
              </div>
              <FieldText
                label="Bagian"
                value={editForm.bagian}
                onChange={(v) => setEditForm((f) => ({ ...f, bagian: v }))}
              />
              <FieldSelect
                label="Status"
                value={editForm.status}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v as Status }))
                }
                options={[
                  ["todo", "Belum dikerjakan"],
                  ["inprogress", "Berjalan"],
                  ["done", "Selesai"],
                ]}
              />

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
                  disabled={savingEdit}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingEdit ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
function Tab({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-medium ${
        active ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-gray-900" />
      )}
    </button>
  );
}
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        type="date"
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | [string, string])[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <select
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) =>
          Array.isArray(opt) ? (
            <option key={opt[0]} value={opt[0]}>
              {opt[1]}
            </option>
          ) : (
            <option key={opt} value={opt}>
              {opt}
            </option>
          )
        )}
      </select>
    </div>
  );
}
