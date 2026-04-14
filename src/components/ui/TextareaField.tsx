import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  endAdornment?: ReactNode
}

export function TextareaField({
  label,
  hint,
  className,
  endAdornment,
  id,
  rows = 4,
  ...props
}: TextareaFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="space-y-2.5 text-sm font-medium text-campus-700">
      <label htmlFor={inputId} className="block text-[0.95rem]">
        {label}
      </label>
      <div className="relative">
        <textarea
          id={inputId}
          rows={rows}
          className={cn(
            'min-h-[7.5rem] w-full rounded-[1.15rem] border border-campus-200 bg-white/92 px-4 py-3 text-[15px] leading-6 text-campus-900 outline-none transition-colors placeholder:text-campus-500 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100',
            endAdornment ? 'pr-20' : '',
            className,
          )}
          {...props}
        />
        {endAdornment && (
          <span className="absolute bottom-3 right-4 text-xs text-campus-500">{endAdornment}</span>
        )}
      </div>
      {hint && <p className="text-xs text-campus-500">{hint}</p>}
    </div>
  )
}
