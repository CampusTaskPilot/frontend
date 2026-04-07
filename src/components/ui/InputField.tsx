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
    <label className="space-y-2.5 text-sm font-medium text-campus-700">
      <span className="text-[0.95rem]">{label}</span>
      <div className="relative">
        <input
          className={cn(
            'min-h-[3.25rem] w-full rounded-[1.15rem] border border-campus-200 bg-white/92 px-4 py-3 text-[15px] text-campus-900 outline-none transition placeholder:text-campus-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100',
            endAdornment ? 'pr-20' : '',
            className,
          )}
          {...props}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-4 flex items-center text-xs text-campus-500">
            {endAdornment}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-campus-500">{hint}</p>}
    </label>
  )
}
