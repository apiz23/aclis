import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type {
  Stats, KampungSummary, LeaderSummary, ReportSummary,
  IssueSummary, EvaluationSummary, AuditLogEntry,
  JpkkBankSummary, JpkkMemberSummary, JpkkMeetingSummary,
  JpkkMeetingDetail, JpkkClaimSummary, JpkkClaimDetail, JpkkStats,
} from "@/lib/types";

export const QUERY_KEYS = {
  me:          ["me"] as const,
  stats:       ["stats"] as const,
  insights:    ["stats", "insights"] as const,
  leaders:     ["leaders"] as const,
  kampung:     ["kampung"] as const,
  issues:      ["issues"] as const,
  reports:     ["reports"] as const,
  evaluations: ["evaluations"] as const,
  audit:       ["audit"] as const,
  jpkk: {
    bank: (kampungId: string) => ["jpkk", "bank", kampungId] as const,
    members: (kampungId: string) => ["jpkk", "members", kampungId] as const,
    meetings: (kampungId: string) => ["jpkk", "meetings", kampungId] as const,
    meeting: (id: string) => ["jpkk", "meeting", id] as const,
    claims: (kampungId: string) => ["jpkk", "claims", kampungId] as const,
    stats: (kampungId: string) => ["jpkk", "stats", kampungId] as const,
  },
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
  return useQuery<Stats>({
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
  return useQuery<LeaderSummary[]>({
    queryKey: QUERY_KEYS.leaders,
    queryFn: () => apiGet("/leaders"),
  });
}

export function useKampung() {
  return useQuery<KampungSummary[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });
}

export function useIssues() {
  return useQuery<IssueSummary[]>({
    queryKey: QUERY_KEYS.issues,
    queryFn: () => apiGet("/issues"),
  });
}

export function useReports() {
  return useQuery<ReportSummary[]>({
    queryKey: QUERY_KEYS.reports,
    queryFn: () => apiGet("/reports"),
  });
}

export function useEvaluations() {
  return useQuery<EvaluationSummary[]>({
    queryKey: QUERY_KEYS.evaluations,
    queryFn: () => apiGet("/evaluations"),
  });
}

export function useAuditLog(enabled = true) {
  return useQuery<AuditLogEntry[]>({
    queryKey: QUERY_KEYS.audit,
    queryFn: () => apiGet("/audit"),
    enabled,
  });
}

export function useJpkkBank(kampungId: string) {
  return useQuery<JpkkBankSummary | null>({
    queryKey: QUERY_KEYS.jpkk.bank(kampungId),
    queryFn: () => apiGet(`/jpkk/bank/${kampungId}`),
    enabled: !!kampungId,
  });
}

export function useJpkkMembers(kampungId: string) {
  return useQuery<JpkkMemberSummary[]>({
    queryKey: QUERY_KEYS.jpkk.members(kampungId),
    queryFn: () => apiGet(`/jpkk/members/${kampungId}`),
    enabled: !!kampungId,
  });
}

export function useJpkkMeetings(kampungId: string) {
  return useQuery<JpkkMeetingSummary[]>({
    queryKey: QUERY_KEYS.jpkk.meetings(kampungId),
    queryFn: () => apiGet(`/jpkk/meetings/${kampungId}`),
    enabled: !!kampungId,
  });
}

export function useJpkkMeeting(id: string) {
  return useQuery<JpkkMeetingDetail>({
    queryKey: QUERY_KEYS.jpkk.meeting(id),
    queryFn: () => apiGet(`/jpkk/meetings/detail/${id}`),
    enabled: !!id,
  });
}

export function useJpkkClaims(kampungId: string) {
  return useQuery<JpkkClaimSummary[]>({
    queryKey: QUERY_KEYS.jpkk.claims(kampungId),
    queryFn: () => apiGet(`/jpkk/claims/${kampungId}`),
    enabled: !!kampungId,
  });
}

export function useJpkkStats(kampungId: string) {
  return useQuery<JpkkStats>({
    queryKey: QUERY_KEYS.jpkk.stats(kampungId),
    queryFn: () => apiGet(`/jpkk/stats/${kampungId}`),
    enabled: !!kampungId,
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
