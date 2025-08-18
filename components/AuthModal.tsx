// src/components/AuthModal.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Mode = "masuk" | "daftar";
type AuthUser = { id: number; username: string; email: string };
type ApiSuccess =
  | { ok: true; user: AuthUser; message?: string }
  | { ok: true; message: string; user?: undefined };
type ApiError = { error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isApiSuccess(v: unknown): v is ApiSuccess {
  if (!isObject(v)) return false;
  const okVal = v["ok"];
  return typeof okVal === "boolean" && okVal === true;
}
function isApiError(v: unknown): v is ApiError {
  if (!isObject(v)) return false;
  const errVal = v["error"];
  return typeof errVal === "string";
}

export default function AuthModal({
  open,
  onClose,
  defaultMode = "masuk",
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultMode?: Mode;
  onSuccess?: (user: AuthUser | undefined) => void;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // form state
  const [identifier, setIdentifier] = useState(""); // email/username saat masuk
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // untuk daftar
  const [email, setEmail] = useState(""); // untuk daftar

  if (!open) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!identifier.trim() || !password) {
      setErr("Isi email/username dan kata sandi.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/masuk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const json: unknown = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErr(isApiError(json) ? json.error : "Gagal masuk.");
      return;
    }
    if (isApiSuccess(json)) {
      let user: AuthUser | undefined;
      if (isObject(json) && isObject(json["user"])) {
        const u = json["user"];
        const id = u["id"];
        const usernameVal = u["username"];
        const emailVal = u["email"];
        if (
          typeof id === "number" &&
          typeof usernameVal === "string" &&
          typeof emailVal === "string"
        ) {
          user = { id, username: usernameVal, email: emailVal };
        }
      }
      setOk("Berhasil masuk.");
      onSuccess?.(user);
      setTimeout(() => {
        setIdentifier("");
        setPassword("");
        setUsername("");
        setEmail("");
        setErr(null);
        setOk(null);
        setShowPwd(false);
        onClose();
      }, 700);
      return;
    }
    setErr("Respons tidak dikenali.");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!username.trim() || !email.trim() || !password) {
      setErr("Lengkapi nama pengguna, email, dan kata sandi.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/daftar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const json: unknown = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErr(isApiError(json) ? json.error : "Gagal mendaftar.");
      return;
    }
    if (isApiSuccess(json)) {
      setOk("Pendaftaran berhasil. Silakan masuk.");
      setTimeout(() => {
         setIdentifier("");
         setPassword("");
         setUsername("");
         setEmail("");
         setErr(null);
         setOk(null);
         setShowPwd(false);
      }, 900);
      return;
    }
    setErr("Respons tidak dikenali.");
  }

  const heading = mode === "masuk" ? `Masuk` : `Daftar`;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-gray-900">
        <h2 className="mb-6 text-3xl md:text-4xl font-extrabold text-gray-800 text-center">
          {heading}
        </h2>

        {mode === "masuk" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-lg font-bold text-gray-800">
                Nama Pengguna:
              </span>
              <input
                className="w-full rounded-full bg-gray-200 px-5 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nama pengguna"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-lg font-bold text-gray-800">
                Kata Sandi:
              </span>
              <div className="relative">
                <input
                  className="w-full rounded-full bg-gray-200 px-5 py-3 text-base pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                  type={showPwd ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={
                    showPwd ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>
            <p className="text-sm">
              Pengguna baru?{" "}
              <button
                type="button"
                className="text-teal-700 underline"
                onClick={() => {
                  setMode("daftar");
                  setErr(null);
                  setOk(null);
                }}
              >
                Daftar
              </button>
            </p>
            {err && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
            {ok && (
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {ok}
              </div>
            )}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="mx-auto block rounded-full bg-blue-700 px-8 py-3 text-white font-semibold shadow hover:bg-blue-800 disabled:opacity-60"
              >
                {loading ? "Memproses…" : "Masuk"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-lg font-bold text-gray-800">
                Nama Pengguna:
              </span>
              <input
                className="w-full rounded-full bg-gray-200 px-5 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-lg font-bold text-gray-800">
                Email:
              </span>
              <input
                className="w-full rounded-full bg-gray-200 px-5 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nama@domain.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-lg font-bold text-gray-800">
                Kata Sandi:
              </span>
              <div className="relative">
                <input
                  className="w-full rounded-full bg-gray-200 px-5 py-3 text-base pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                  type={showPwd ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={
                    showPwd ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>
            <p className="text-sm">
              Sudah punya akun?{" "}
              <button
                type="button"
                className="text-teal-700 underline"
                onClick={() => {
                  setMode("masuk");
                  setErr(null);
                  setOk(null);
                }}
              >
                Masuk
              </button>
            </p>
            {err && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
            {ok && (
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {ok}
              </div>
            )}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="mx-auto block rounded-full bg-blue-700 px-8 py-3 text-white font-semibold shadow hover:bg-blue-800 disabled:opacity-60"
              >
                {loading ? "Memproses…" : "Daftar"}
              </button>
            </div>
          </form>
        )}
        <button
          onClick={onClose}
          className="mt-4 block w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
