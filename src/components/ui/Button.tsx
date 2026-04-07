import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'ghost' | 'subtle'
type ButtonSize = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-campus-900 text-white shadow-card hover:-translate-y-0.5 hover:bg-campus-700 focus-visible:outline-campus-900',
  ghost:
    'border border-campus-200 bg-white/92 text-campus-700 hover:border-campus-300 hover:bg-campus-50 focus-visible:outline-brand-400',
  subtle:
    'border border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:outline-brand-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 py-2.5 text-sm',
  sm: 'min-h-9 px-3.5 py-1.5 text-sm',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>
    return cloneElement(child, {
      className: cn(child.props.className, classes),
    })
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
