import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Isi email/username dan kata sandi." },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("akun")
      .select("id, username, email, password")
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .maybeSingle();

    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );

    const match = await bcrypt.compare(password, data.password as string);
    if (!match)
      return NextResponse.json({ error: "Kata sandi salah." }, { status: 401 });
    return NextResponse.json({
      ok: true,
      user: { id: data.id, username: data.username, email: data.email },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal masuk.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
