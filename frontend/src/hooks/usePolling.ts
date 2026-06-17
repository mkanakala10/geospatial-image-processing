import { useQuery } from '@tanstack/react-query'
import { analysesApi } from '@/services/api'
import type { AnalysisStatus, AnalysisStatusPoll } from '@/types'

const TERMINAL: AnalysisStatus[] = ['completed', 'failed', 'cancelled']

export function useAnalysisPolling(analysisId: string | undefined) {
  return useQuery({
    queryKey: ['analysis-status', analysisId],
    queryFn: () => analysesApi.getStatus(analysisId!),
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const data = query.state.data as AnalysisStatusPoll | undefined
      if (!data) return 3000
      return TERMINAL.includes(data.status) ? false : 2000
    },
    staleTime: 0,
  })
}
