import { Loader2, CheckCircle2, XCircle, Clock, Ban, Zap } from 'lucide-react'
import type { AnalysisStatus } from '@/types'
import clsx from 'clsx'

const config: Record<AnalysisStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    cls: 'badge-gray',   icon: Clock },
  queued:     { label: 'Queued',     cls: 'badge-blue',   icon: Zap },
  processing: { label: 'Processing', cls: 'badge-yellow', icon: Loader2 },
  completed:  { label: 'Completed',  cls: 'badge-green',  icon: CheckCircle2 },
  failed:     { label: 'Failed',     cls: 'badge-red',    icon: XCircle },
  cancelled:  { label: 'Cancelled',  cls: 'badge-gray',   icon: Ban },
}

export default function StatusBadge({ status }: { status: AnalysisStatus }) {
  const { label, cls, icon: Icon } = config[status]
  return (
    <span className={clsx(cls, 'gap-1')}>
      <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      {label}
    </span>
  )
}
