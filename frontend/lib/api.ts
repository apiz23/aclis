import { supabase } from "@/lib/supabase";

export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiGet(path: string) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiPatch(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiPut(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export async function uploadLeaderPhoto(file: File): Promise<string> {
  const { supabase } = await import("@/lib/supabase");
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `pending/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("aclis-leader-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("aclis-leader-photos").getPublicUrl(path);
  return data.publicUrl;
}
