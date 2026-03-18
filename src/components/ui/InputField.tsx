import { type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  endAdornment?: ReactNode
}

export function InputField({
  label,
  hint,
  className,
  endAdornment,
  ...props
}: InputFieldProps) {
  return (
    <label className="space-y-2 text-sm font-medium text-campus-700">
      <span>{label}</span>
      <div className="relative">
        <input
          className={cn(
            'w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200',
            endAdornment ? 'pr-14' : '',
            className,
          )}
          {...props}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-3 flex items-center text-xs text-campus-500">
            {endAdornment}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-campus-500">{hint}</p>}
    </label>
  )
}
