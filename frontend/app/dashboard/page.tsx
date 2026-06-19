"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function Dashboard() {
  const [role, setRole] = useState<string>("...");
  useEffect(() => {
    apiGet("/me").then((u) => setRole(u.role)).catch(() => setRole("unauthenticated"));
  }, []);
  return <main className="p-8"><h1 className="text-xl">Papan Pemuka — peranan: {role}</h1></main>;
}
