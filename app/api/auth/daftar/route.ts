import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Lengkapi username, email, dan kata sandi." },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from("akun")
      .insert([{ username, email, password: password_hash }]);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Pendaftaran berhasil." });
  } catch (error: unknown) {
     const message = error instanceof Error ? error.message : "Gagal mendaftar.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
