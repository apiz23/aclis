import { supabase } from "@/lib/supabase";

export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
