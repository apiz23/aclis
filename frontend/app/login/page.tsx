"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setErr(error.message);
    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto mt-24 space-y-3">
      <h1 className="text-xl font-semibold">ACLIS Log Masuk</h1>
      <input className="border p-2 w-full" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 w-full" type="password" placeholder="Kata Laluan"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button type="submit" className="bg-black text-white px-4 py-2 w-full">Masuk</button>
    </form>
  );
}
