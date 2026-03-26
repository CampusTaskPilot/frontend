import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

export function ReportWriterTab() {
  const [preset, setPreset] = useState('이번 주')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [report, setReport] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setReport(
      [
        '주간 보고서 초안',
        `선택 기간: ${preset}${startDate || endDate ? ` (${startDate || '미정'} ~ ${endDate || '미정'})` : ''}`,
        '이 탭은 이후 팀 활동 데이터를 모아 보고서 문서 형태로 확장될 수 있도록 분리되어 있습니다.',
      ].join('\n\n'),
    )
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-campus-900">보고서 작성</h2>
        <p className="text-sm text-campus-600">
          기간 선택과 문서형 출력에 집중한 독립 탭입니다.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-3">
          {['이번 주', '지난 주', '직접 선택'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPreset(item)}
              className={[
                'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                preset === item
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-campus-200 bg-white text-campus-700',
              ].join(' ')}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>시작일</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>종료일</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button type="submit">보고서 생성</Button>
        </div>
      </form>

      <div className="rounded-3xl border border-campus-200 bg-campus-50 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-campus-800">
          {report || '생성된 보고서 초안이 여기에 표시됩니다.'}
        </pre>
      </div>
    </Card>
  )
}
