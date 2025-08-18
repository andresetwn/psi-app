"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
type Row = {
  id: number;
  npm: number; 
  tanggal: string;
  waktu_mulai: string; 
  waktu_selesai: string; 
  created_at: string;
};
type Programmer = { npm: number; nama: string };
type AuthUser = { id: number; username: string; email: string };

function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
function mustLogin(): boolean {
  const ok = !!getUser();
  if (!ok) alert("Silahkan Masuk Terlebih Dahulu!");
  return !ok;
}
const hhmm = (t: string) => (t ? t.slice(0, 5) : "");
const fmtDateID = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function startOfWeekMon(d: Date) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = c.getDay(); 
  const delta = (dow + 6) % 7;
  c.setDate(c.getDate() - delta);
  return c;
}
function endOfWeekMon(d: Date) {
  const s = startOfWeekMon(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addWeeks(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n * 7);
  return c;
}
function addMonths(d: Date, n: number) {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}
function toPgTime(raw: string): string | null {
  if (!raw) return null;
  const s = raw
    .trim()
    .replace(/\./g, ":")
    .replace(/[^0-9:]/g, "");
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}:00`;
}
export default function StandbyPage() {
  const [tab, setTab] = useState<"mingguan" | "bulanan">("mingguan");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const [rows, setRows] = useState<Row[]>([]);
  const [programmers, setProgrammers] = useState<Programmer[]>([]);
  const [loading, setLoading] = useState(true);

  // Tambah
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    npm: "",
    tanggal: "",
    mulai: "08:30",
    selesai: "15:30",
  });

  // Edit
  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    npm: "",
    tanggal: "",
    mulai: "08:30",
    selesai: "15:30",
  });

  useEffect(() => {
    void loadAll();
  }, []);
  async function loadAll() {
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase
        .from("programmer")
        .select("npm,nama")
        .order("nama", { ascending: true }),
      supabase
        .from("standby")
        .select("id,npm,tanggal,waktu_mulai,waktu_selesai,created_at")
        .order("tanggal", { ascending: true }),
    ]);
    if (!p.error && p.data) setProgrammers(p.data as Programmer[]);
    if (!s.error && s.data) setRows(s.data as Row[]);
    setLoading(false);
  }
  const nameOf = useMemo(() => {
    const m = new Map(programmers.map((p) => [p.npm, p.nama]));
    return (npm: number) => m.get(npm) ?? `#${npm}`;
  }, [programmers]);

  const range = useMemo(() => {
    if (tab === "mingguan") {
      const start = startOfWeekMon(anchor);
      const end = endOfWeekMon(anchor);
      return {
        start,
        end,
        label: `${start.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        })} – ${end.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
      };
    }
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return {
      start,
      end,
      label: anchor.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [tab, anchor]);

  const visibleRows = useMemo(() => {
    const s = toYMD(range.start);
    const e = toYMD(range.end);
    return rows.filter((r) => r.tanggal >= s && r.tanggal <= e);
  }, [rows, range]);

  {/* Tambah  */}
  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (mustLogin()) return;
    if (!form.npm || !form.tanggal) return;

    const mulaiDb = toPgTime(form.mulai);
    const selesaiDb = toPgTime(form.selesai);
    if (!mulaiDb || !selesaiDb) {
      alert("Format waktu harus HH:MM, contoh 08:30");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("standby").insert([
      {
        npm: Number(form.npm),
        tanggal: form.tanggal,
        waktu_mulai: mulaiDb,
        waktu_selesai: selesaiDb,
      },
    ]);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }

    setOpen(false);
    setForm({ npm: "", tanggal: "", mulai: "08:30", selesai: "15:30" });
    await loadAll();
  }

  {/* Edit */}
  function startEdit(r: Row) {
    if (mustLogin()) return;
    setEditId(r.id);
    setEditForm({
      npm: String(r.npm),
      tanggal: r.tanggal,
      mulai: hhmm(r.waktu_mulai),
      selesai: hhmm(r.waktu_selesai),
    });
    setOpenEdit(true);
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (mustLogin()) return;
    if (editId == null) return;

    const mulaiDb = toPgTime(editForm.mulai);
    const selesaiDb = toPgTime(editForm.selesai);
    if (!mulaiDb || !selesaiDb) {
      alert("Format waktu harus HH:MM, contoh 08:30");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("standby")
      .update({
        npm: Number(editForm.npm),
        tanggal: editForm.tanggal,
        waktu_mulai: mulaiDb,
        waktu_selesai: selesaiDb,
      })
      .eq("id", editId);
    setSavingEdit(false);
    if (error) {
      alert(error.message);
      return;
    }

    setOpenEdit(false);
    setEditId(null);
    await loadAll();
  }

{/* Hapus */}
  async function removeEntry(id: number) {
    if (mustLogin()) return;
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("standby").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <section className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 py-8">Jadwal</h1>

      <div className="border-b">
        <div className="flex gap-6 items-end justify-between">
          <div className="flex gap-6">
            <Tab active={tab === "mingguan"} onClick={() => setTab("mingguan")}>
              Mingguan
            </Tab>
            <Tab active={tab === "bulanan"} onClick={() => setTab("bulanan")}>
              Bulanan
            </Tab>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              className="rounded-md px-2 py-1 text-sm hover:bg-gray-100 text-gray-800"
              onClick={() =>
                setAnchor(
                  tab === "mingguan"
                    ? addWeeks(anchor, -1)
                    : addMonths(anchor, -1)
                )
              }
            >
              ‹
            </button>
            <span className="text-sm text-gray-600">{range.label}</span>
            <button
              className="rounded-md px-2 py-1 text-sm hover:bg-gray-100 text-gray-800"
              onClick={() =>
                setAnchor(
                  tab === "mingguan"
                    ? addWeeks(anchor, +1)
                    : addMonths(anchor, +1)
                )
              }
            >
              ›
            </button>
            <button
              className="ml-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-200"
              onClick={() => setAnchor(new Date())}
            >
              Hari ini
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Jadwal Standby</h2>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={() => {
            if (mustLogin()) return;
            setOpen(true);
          }}
        >
          Tambah Jadwal
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>Nama Programmer</Th>
              <Th>Tanggal</Th>
              <Th>Waktu Mulai</Th>
              <Th>Waktu Selesai</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-sm text-gray-500">
                  Memuat…
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-sm text-gray-500">
                  Tidak ada jadwal pada rentang ini.
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {nameOf(r.npm)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {fmtDateID(r.tanggal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {hhmm(r.waktu_mulai)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {hhmm(r.waktu_selesai)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      className="text-blue-600 hover:underline mr-3"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => void removeEntry(r.id)}
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

      {/* Modal Tambah */}
      {open && (
        <Modal title="Tambah Jadwal" onClose={() => setOpen(false)}>
          <form onSubmit={createEntry} className="space-y-3">
            <FieldSelect
              label="Programmer"
              value={form.npm}
              onChange={(v) => setForm((f) => ({ ...f, npm: v }))}
              options={[
                ["", "Pilih Programmer"] as const,
                ...programmers.map<[string, string]>((p) => [
                  String(p.npm),
                  p.nama,
                ]),
              ]}
            />
            <FieldDate
              label="Tanggal"
              value={form.tanggal}
              onChange={(v) => setForm((f) => ({ ...f, tanggal: v }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldTime
                label="Waktu Mulai"
                value={form.mulai}
                onChange={(v) => setForm((f) => ({ ...f, mulai: v }))}
              />
              <FieldTime
                label="Waktu Selesai"
                value={form.selesai}
                onChange={(v) => setForm((f) => ({ ...f, selesai: v }))}
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
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal Edit */}
      {openEdit && (
        <Modal title="Ubah Jadwal" onClose={() => setOpenEdit(false)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <FieldSelect
              label="Programmer"
              value={editForm.npm}
              onChange={(v) => setEditForm((f) => ({ ...f, npm: v }))}
              options={[
                ["", "Pilih Programmer"] as const,
                ...programmers.map<[string, string]>((p) => [
                  String(p.npm),
                  p.nama,
                ]),
              ]}
            />
            <FieldDate
              label="Tanggal"
              value={editForm.tanggal}
              onChange={(v) => setEditForm((f) => ({ ...f, tanggal: v }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldTime
                label="Waktu Mulai"
                value={editForm.mulai}
                onChange={(v) => setEditForm((f) => ({ ...f, mulai: v }))}
              />
              <FieldTime
                label="Waktu Selesai"
                value={editForm.selesai}
                onChange={(v) => setEditForm((f) => ({ ...f, selesai: v }))}
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
                disabled={savingEdit}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingEdit ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </Modal>
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
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 text-gray-900">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="text-gray-500 hover:text-gray-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
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
function FieldTime({
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
        type="time"
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
  options: Array<string | [string, string]>;
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
