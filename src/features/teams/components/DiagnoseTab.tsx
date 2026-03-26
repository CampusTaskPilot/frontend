import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

interface DiagnoseMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGES: DiagnoseMessage[] = [
  {
    id: 1,
    role: 'assistant',
    content:
      '문제 진단 탭입니다. 현재는 채팅형 인터페이스 뼈대를 제공하며, 이후 task 수정/재배정 액션으로 확장할 수 있도록 분리되어 있습니다.',
  },
]

export function DiagnoseTab() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DiagnoseMessage[]>(INITIAL_MESSAGES)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) {
      return
    }

    setMessages((current) => [
      ...current,
      { id: current.length + 1, role: 'user', content: trimmed },
      {
        id: current.length + 2,
        role: 'assistant',
        content:
          '진단 초안이 준비되었습니다. 이후 단계에서는 이 대화를 바탕으로 병목 분석, task 수정, 재배정 액션을 연결할 수 있습니다.',
      },
    ])
    setInput('')
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-campus-900">문제 진단</h2>
        <p className="text-sm text-campus-600">
          채팅 기반으로 이슈를 정리하고, 추후 실행 액션으로 연결될 수 있도록 분리된 인터페이스입니다.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-campus-200 bg-campus-50 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={[
              'max-w-3xl rounded-2xl px-4 py-3 text-sm',
              message.role === 'assistant'
                ? 'bg-white text-campus-800'
                : 'ml-auto bg-brand-50 text-brand-700',
            ].join(' ')}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          placeholder="현재 문제 상황, 막힌 지점, 기대하는 도움을 입력해 주세요."
        />
        <div className="flex justify-end">
          <Button type="submit">진단 시작</Button>
        </div>
      </form>
    </Card>
  )
}
