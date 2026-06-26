import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export const QUERY_KEYS = {
  me:          ["me"] as const,
  stats:       ["stats"] as const,
  insights:    ["stats", "insights"] as const,
  leaders:     ["leaders"] as const,
  kampung:     ["kampung"] as const,
  issues:      ["issues"] as const,
  reports:     ["reports"] as const,
  evaluations: ["evaluations"] as const,
};

export interface MeResponse { id: string; email: string | null; role: string }

export function useCurrentUser() {
  return useQuery<MeResponse>({
    queryKey: QUERY_KEYS.me,
    queryFn: () => apiGet("/me"),
    staleTime: 5 * 60_000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => apiGet("/stats"),
  });
}

export function useInsights() {
  return useQuery<{ insights: string[] }>({
    queryKey: QUERY_KEYS.insights,
    queryFn: () => apiGet("/stats/insights"),
    staleTime: 2 * 60_000,
  });
}

export function useLeaders() {
  return useQuery({
    queryKey: QUERY_KEYS.leaders,
    queryFn: () => apiGet("/leaders"),
  });
}

export function useKampung() {
  return useQuery({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });
}

export function useIssues() {
  return useQuery({
    queryKey: QUERY_KEYS.issues,
    queryFn: () => apiGet("/issues"),
  });
}

export function useReports() {
  return useQuery({
    queryKey: QUERY_KEYS.reports,
    queryFn: () => apiGet("/reports"),
  });
}

export function useEvaluations() {
  return useQuery({
    queryKey: QUERY_KEYS.evaluations,
    queryFn: () => apiGet("/evaluations"),
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
