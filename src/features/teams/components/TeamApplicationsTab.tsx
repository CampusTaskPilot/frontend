import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LoaderCircle, Sparkles } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type {
  TeamApplicationAnalysisLookupRecord,
  TeamApplicationAnalysisSummary,
  TeamApplicationSummaryRecord,
} from '../types/team'

interface TeamApplicationsTabProps {
  applications: TeamApplicationSummaryRecord[]
  applicationAnalysisById: Record<string, TeamApplicationAnalysisLookupRecord>
  isLoading: boolean
  errorMessage: string
  actionMessage: string
  pendingApplicationId: string | null
  onRefreshAnalysis: (applicationId: string) => Promise<TeamApplicationAnalysisLookupRecord | null>
  onUpdateStatus: (application: TeamApplicationSummaryRecord, status: 'accepted' | 'rejected') => Promise<void>
  onEnsureAnalysis: (
    application: TeamApplicationSummaryRecord,
    triggerSource?: 'on_first_view' | 'manual_retry',
  ) => Promise<void>
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '미정'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function applicationStatusLabel(status: TeamApplicationSummaryRecord['status']) {
  switch (status) {
    case 'accepted':
      return '수락됨'
    case 'rejected':
      return '거절됨'
    case 'withdrawn':
      return '철회됨'
    default:
      return '대기 중'
  }
}

function analysisStatusLabel(status: TeamApplicationAnalysisSummary['status']) {
  switch (status) {
    case 'completed':
      return '분석 완료'
    case 'failed':
      return '분석 실패'
    case 'processing':
      return '분석 중'
    case 'deferred':
      return '분석 대기'
    case 'insufficient_data':
      return '정보 부족'
    default:
      return '큐 대기'
  }
}

function analysisSuitabilityLabel(level: TeamApplicationAnalysisSummary['suitability_level']) {
  switch (level) {
    case 'high':
      return '높음'
    case 'medium':
      return '보통'
    case 'low':
      return '낮음'
    case 'insufficient_data':
      return '정보 부족'
    default:
      return '미정'
  }
}

function analysisBadgeClass(status: TeamApplicationAnalysisSummary['status']) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'failed') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (status === 'insufficient_data') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-campus-100 text-campus-700 ring-campus-200'
}

function suitabilityBadgeClass(level: TeamApplicationAnalysisSummary['suitability_level']) {
  if (level === 'high') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (level === 'medium') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (level === 'low') return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

function AnalysisPanel({
  application,
  analysisDetail,
  isDetailLoading,
  pendingApplicationId,
  onRefreshAnalysis,
  onEnsureAnalysis,
}: {
  application: TeamApplicationSummaryRecord
  analysisDetail: TeamApplicationAnalysisLookupRecord | null
  isDetailLoading: boolean
  pendingApplicationId: string | null
  onRefreshAnalysis: (applicationId: string) => Promise<TeamApplicationAnalysisLookupRecord | null>
  onEnsureAnalysis: (application: TeamApplicationSummaryRecord, triggerSource?: 'on_first_view' | 'manual_retry') => Promise<void>
}) {
  const summaryAnalysis = application.analysis
  const resolvedAnalysis = analysisDetail ?? summaryAnalysis
  const isBusy = pendingApplicationId === application.id

  if (!resolvedAnalysis) {
    return (
      <div className="rounded-[1.2rem] border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-600">
        AI 분석 정보가 아직 준비되지 않았습니다.
      </div>
    )
  }

  if (resolvedAnalysis.status === 'deferred') {
    return (
      <div className="space-y-3 rounded-[1.2rem] border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-700">
        <div>
          <p className="font-medium text-campus-900">AI 분석이 아직 시작되지 않았습니다.</p>
          <p className="mt-1 leading-6">원할 때 직접 시작할 수 있습니다. 탭 진입만으로는 분석이 시작되지 않습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isBusy} onClick={() => void onEnsureAnalysis(application, 'on_first_view')}>
            {isBusy ? '시작 중...' : 'AI 분석 시작'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isDetailLoading}
            onClick={() => void onRefreshAnalysis(application.id)}
          >
            {isDetailLoading ? '확인 중...' : '상태 다시 확인'}
          </Button>
        </div>
      </div>
    )
  }

  if (resolvedAnalysis.status === 'queued' || resolvedAnalysis.status === 'processing') {
    return (
      <div className="space-y-3 rounded-[1.2rem] border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-700">
        <div>
          <p className="font-medium text-campus-900">AI 분석이 진행 중입니다.</p>
          <p className="mt-1 leading-6">잠시 후 다시 확인해 주세요.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={isDetailLoading}
          onClick={() => void onRefreshAnalysis(application.id)}
        >
          {isDetailLoading ? '확인 중...' : '다시 확인'}
        </Button>
      </div>
    )
  }

  if (!analysisDetail?.details_available) {
    return (
      <div className="space-y-3 rounded-[1.2rem] border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-700">
        <div>
          <p className="font-medium text-campus-900">AI 분석 상세를 불러오는 중입니다.</p>
          <p className="mt-1 leading-6">잠시 후 다시 확인해 주세요.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={isDetailLoading}
          onClick={() => void onRefreshAnalysis(application.id)}
        >
          {isDetailLoading ? '불러오는 중...' : '다시 확인'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-[1.3rem] border border-campus-200 bg-white/90 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
            suitabilityBadgeClass(analysisDetail.suitability_level),
          ].join(' ')}
        >
          적합도 {analysisSuitabilityLabel(analysisDetail.suitability_level)}
        </span>
        {analysisDetail.confidence ? <Badge variant="neutral">확신도 {analysisDetail.confidence}</Badge> : null}
        <Badge variant="neutral">분석 시각 {formatDateTime(analysisDetail.completed_at || analysisDetail.updated_at)}</Badge>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-campus-900">한줄 요약</p>
        <p className="text-sm leading-6 text-campus-700">
          {analysisDetail.one_line_summary || '요약이 아직 준비되지 않았습니다.'}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-campus-900">맞는 점</h3>
        {analysisDetail.strengths.length > 0 ? (
          <ul className="space-y-1 text-sm leading-6 text-campus-700">
            {analysisDetail.strengths.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-campus-500">강점으로 정리된 내용이 없습니다.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-campus-900">우려 포인트</h3>
        {analysisDetail.concerns.length > 0 ? (
          <ul className="space-y-1 text-sm leading-6 text-campus-700">
            {analysisDetail.concerns.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-campus-500">현재 기준에서 큰 우려 포인트는 없습니다.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-campus-900">추가 확인 질문</h3>
        {analysisDetail.follow_up_questions.length > 0 ? (
          <ul className="space-y-1 text-sm leading-6 text-campus-700">
            {analysisDetail.follow_up_questions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-campus-500">추천 질문이 없습니다.</p>
        )}
      </section>

      {analysisDetail.status === 'insufficient_data' && analysisDetail.reasons.length > 0 ? (
        <section className="space-y-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-3">
          <h3 className="text-sm font-semibold text-amber-800">정보 부족 안내</h3>
          <ul className="space-y-1 text-sm leading-6 text-amber-700">
            {analysisDetail.reasons.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysisDetail.status === 'failed' ? (
        <section className="space-y-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-3">
          <div>
            <p className="text-sm font-semibold text-rose-700">분석 실패</p>
            <p className="mt-1 text-sm leading-6 text-rose-600">
              {analysisDetail.last_error || '일시적인 오류로 분석을 완료하지 못했습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={isBusy} onClick={() => void onEnsureAnalysis(application, 'manual_retry')}>
              {isBusy ? '재시도 중...' : '재시도'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isDetailLoading}
              onClick={() => void onRefreshAnalysis(application.id)}
            >
              {isDetailLoading ? '확인 중...' : '다시 확인'}
            </Button>
          </div>
        </section>
      ) : (
        <div>
          <Button
            type="button"
            variant="ghost"
            disabled={isDetailLoading}
            onClick={() => void onRefreshAnalysis(application.id)}
          >
            {isDetailLoading ? '확인 중...' : '다시 확인'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function TeamApplicationsTab({
  applications,
  applicationAnalysisById,
  isLoading,
  errorMessage,
  actionMessage,
  pendingApplicationId,
  onRefreshAnalysis,
  onUpdateStatus,
  onEnsureAnalysis,
}: TeamApplicationsTabProps) {
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<string[]>([])
  const [loadingDetailIds, setLoadingDetailIds] = useState<string[]>([])

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((a, b) => {
        const order = { pending: 0, accepted: 1, rejected: 2, withdrawn: 3 }
        return order[a.status] - order[b.status]
      }),
    [applications],
  )

  async function refreshAnalysis(applicationId: string) {
    setLoadingDetailIds((current) => (current.includes(applicationId) ? current : [...current, applicationId]))
    try {
      return await onRefreshAnalysis(applicationId)
    } finally {
      setLoadingDetailIds((current) => current.filter((id) => id !== applicationId))
    }
  }

  async function handleToggleAnalysis(application: TeamApplicationSummaryRecord) {
    const isExpanded = expandedApplicationIds.includes(application.id)
    const nextExpanded = !isExpanded

    setExpandedApplicationIds((current) =>
      current.includes(application.id) ? current.filter((id) => id !== application.id) : [...current, application.id],
    )

    if (!nextExpanded || !application.analysis) {
      return
    }

    await refreshAnalysis(application.id)
  }

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-campus-600">신청 목록을 불러오는 중입니다...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">APPLICATIONS</p>
            <h2 className="font-display text-2xl text-campus-900">신청자 관리</h2>
          </div>
          <Badge variant="neutral">총 {applications.length}건</Badge>
        </div>
        <p className="text-sm leading-6 text-campus-600">
         지원자를 확인한 뒤, 필요 시 AI 분석을 확인해보세요.
        </p>
        {(errorMessage || actionMessage) && (
          <div
            aria-live="polite"
            className={[
              'rounded-[1.1rem] px-4 py-3 text-sm',
              errorMessage
                ? 'border border-rose-200 bg-rose-50 text-rose-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {errorMessage || actionMessage}
          </div>
        )}
      </Card>

      {sortedApplications.length === 0 ? (
        <Card className="space-y-2">
          <p className="font-medium text-campus-900">아직 들어온 신청이 없습니다.</p>
          <p className="text-sm leading-6 text-campus-600">
            새 신청이 들어오면 여기에서 상태를 검토하고 AI 보조 분석을 확인할 수 있습니다.
          </p>
        </Card>
      ) : (
        sortedApplications.map((application) => {
          const analysisDetail = applicationAnalysisById[application.id] ?? null
          const resolvedAnalysis = analysisDetail ?? application.analysis
          const isExpanded = expandedApplicationIds.includes(application.id)
          const isBusy = pendingApplicationId === application.id
          const isDetailLoading = loadingDetailIds.includes(application.id)

          return (
            <Card key={application.id} className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-3">
                      {application.applicant.profile_image_url ? (
                        <img
                          src={application.applicant.profile_image_url}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-campus-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-campus-100 text-sm font-semibold text-campus-700 ring-1 ring-campus-200">
                          {application.applicant.display_name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-display text-xl text-campus-900">{application.applicant.display_name}</h3>
                        <p className="text-sm font-medium text-campus-700">
                          {application.applicant.headline || '소개 문구가 없습니다.'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        application.status === 'accepted'
                          ? 'success'
                          : application.status === 'rejected'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {applicationStatusLabel(application.status)}
                    </Badge>
                    {resolvedAnalysis ? (
                      <span
                        className={[
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                          analysisBadgeClass(resolvedAnalysis.status),
                        ].join(' ')}
                      >
                        {analysisStatusLabel(resolvedAnalysis.status)}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-campus-600">신청 시각 {formatDateTime(application.applied_at)}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="ghost" asChild>
                    <Link to={`/profile/${application.applicant_user_id}`}>프로필 보기</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleToggleAnalysis(application)}
                    aria-expanded={isExpanded}
                    aria-controls={`analysis-panel-${application.id}`}
                  >
                    <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" />
                    AI 분석 보기
                    <ChevronDown
                      aria-hidden="true"
                      className={['ml-2 h-4 w-4 transition-transform', isExpanded ? 'rotate-180' : 'rotate-0'].join(' ')}
                    />
                  </Button>
                  {application.status === 'pending' ? (
                    <>
                      <Button type="button" disabled={isBusy} onClick={() => void onUpdateStatus(application, 'accepted')}>
                        {isBusy ? <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
                        수락
                      </Button>
                      <Button type="button" variant="ghost" disabled={isBusy} onClick={() => void onUpdateStatus(application, 'rejected')}>
                        거절
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-campus-200 bg-campus-50 px-4 py-4">
                <p className="text-sm font-semibold text-campus-900">신청 메시지</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-campus-700">
                  {application.applicant.application_message || '입력한 메시지가 없습니다.'}
                </p>
              </div>

              {isExpanded ? (
                <div id={`analysis-panel-${application.id}`} className="space-y-4">
                  <AnalysisPanel
                    application={application}
                    analysisDetail={analysisDetail}
                    isDetailLoading={isDetailLoading}
                    pendingApplicationId={pendingApplicationId}
                    onRefreshAnalysis={refreshAnalysis}
                    onEnsureAnalysis={onEnsureAnalysis}
                  />
                </div>
              ) : null}
            </Card>
          )
        })
      )}
    </div>
  )
}
