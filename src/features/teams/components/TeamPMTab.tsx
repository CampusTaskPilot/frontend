import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

export function TeamPMTab() {
  const [issue, setIssue] = useState('')
  const [request, setRequest] = useState('')
  const [result, setResult] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!issue.trim() && !request.trim()) {
      setResult('문제 상황 또는 요청 내용을 입력해 주세요.')
      return
    }

    setResult(
      [
        'PM 상담 결과(임시):',
        `- 핵심 문제: ${issue.trim() || '미입력'}`,
        `- 요청 내용: ${request.trim() || '미입력'}`,
        '- 다음 액션: 우선순위 정의 -> 담당자 배정 -> 일정 재조정',
      ].join('\n'),
    )
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-display text-2xl text-campus-900">PM 상담</h2>
      <form className="space-y-3" onSubmit={(event) => handleSubmit(event)}>
        <label className="space-y-2 text-sm font-medium text-campus-700">
          <span>문제 상황</span>
          <textarea
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            placeholder="예: 일정이 지연되고 역할 분담이 불명확함"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-campus-700">
          <span>요청 내용</span>
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            placeholder="예: 회의 안건 정리와 우선순위 제안을 받고 싶어요."
          />
        </label>
        <div className="flex justify-end">
          <Button type="submit">상담 요청</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4">
        <p className="text-xs text-campus-500">결과</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-campus-800">
          {result || '상담 요청을 입력하면 결과가 여기에 표시됩니다.'}
        </pre>
      </div>
    </Card>
  )
}
