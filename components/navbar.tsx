"use client";

import Link from "next/link";
import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import Image from "next/image";

type Mode = "masuk" | "daftar";
type AuthUser = { id: number; username: string; email: string };

const modeMap = {
  masuk: "masuk",
  daftar: "daftar",
} as const;
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

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<Mode>("masuk");
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(readStoredUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_user") setUser(readStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isLoggedIn = !!user;

  function handleLogout() {
    localStorage.removeItem("auth_user");
    setUser(null);
  }
  return (
    <div>
      <header className="border-b bg-[#ffffff]">
        <div className="mx-auto max-w-7xl px-4 py-3 flex justify-between items-center text-black">
          <div className="flex items-center gap-2">
              <Link href={"/"} className="flex items-center gap-2">
               <Image src="/logo.png" alt="logo" width={40} height={50}/>
                <span className="text-lg font-bold">
                  Laboratorium Psikologi UG
                </span>
                
              </Link>
        
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/" className="hover:font-semibold">
              Beranda
            </Link>
            <Link href="/programmer" className="hover:font-semibold">
              Data Programmer
            </Link>
            <Link href="/pekerjaan" className="hover:font-semibold">
              Pekerjaan
            </Link>
            <Link href="/standby" className="hover:font-semibold">
              Standby
            </Link>

            <div className="flex gap-4 items-center">
              {isLoggedIn ? (
                <>
                  <span className="hidden sm:inline text-lg text-gray-600">
                    Hai, <span className="font-semibold">{user?.username}</span>
                  </span>
                  <button
                    className="rounded-md bg-red-600 text-white px-4 py-2 font-medium hover:bg-red-700"
                    onClick={() => {
                      if (window.confirm("Yakin ingin keluar?")) {
                        handleLogout();
                      }
                    }}
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="ml-4 rounded-md bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700"
                    onClick={() => {
                      setAuthMode("masuk");
                      setIsOpen(true);
                    }}
                  >
                    Masuk
                  </button>
                  <button
                    className="rounded-md bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700"
                    onClick={() => {
                      setAuthMode("daftar");
                      setIsOpen(true);
                    }}
                  >
                    Daftar
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <AuthModal
        key={authMode}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        defaultMode={modeMap[authMode]}
        onSuccess={(u) => {
          if (u) {
            localStorage.setItem("auth_user", JSON.stringify(u));
            setUser(u);
          }
        }}
      />
    </div>
  );
}
