import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

interface DeleteAccountModalProps {
  isOpen: boolean
  email: string
  isSubmitting: boolean
  errorMessage: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

function DeleteAccountModalBody({
  email,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: Omit<DeleteAccountModalProps, 'isOpen'>) {
  const [confirmationEmail, setConfirmationEmail] = useState('')

  const isMatched = useMemo(
    () => confirmationEmail.trim() === email.trim(),
    [confirmationEmail, email],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/40 px-4">
      <Card className="w-full max-w-lg space-y-5 rounded-[2rem] border-rose-200">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">주의</p>
          <h2 className="font-display text-2xl text-campus-900">정말로 계정을 삭제하시겠어요?</h2>
          <p className="text-sm leading-relaxed text-campus-600">
            삭제 후에는 프로필과 활동 정보가 더 이상 표시되지 않습니다. 진행 전 필요한 정보를 먼저 확인해 주세요.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>현재 계정 이메일: {email}</p>
          <p className="mt-1">
            삭제를 진행하려면 아래 입력란에 현재 이메일을 정확히 입력해주세요.
          </p>
        </div>

        <label className="space-y-2 text-sm font-medium text-campus-700">
          <span>이메일 다시 입력</span>
          <input
            value={confirmationEmail}
            onChange={(event) => setConfirmationEmail(event.target.value)}
            placeholder={email}
            className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
          />
        </label>

        {errorMessage && <p className="text-sm text-rose-500">{errorMessage}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!isMatched || isSubmitting}
            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '삭제 중...' : '계정 삭제'}
          </button>
        </div>
      </Card>
    </div>
  )
}

export function DeleteAccountModal(props: DeleteAccountModalProps) {
  if (!props.isOpen) {
    return null
  }

  return (
    <DeleteAccountModalBody
      key={`${props.email}-${String(props.isOpen)}`}
      email={props.email}
      isSubmitting={props.isSubmitting}
      errorMessage={props.errorMessage}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
    />
  )
}
