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
    'bg-gradient-to-r from-brand-500 via-brand-400 to-accent-400 text-white shadow-lg shadow-brand-500/20 hover:brightness-105 focus-visible:outline-brand-500',
  ghost:
    'bg-white text-campus-700 border border-campus-200 hover:bg-brand-50 focus-visible:outline-brand-400',
  subtle:
    'bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100 focus-visible:outline-brand-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  sm: 'px-3.5 py-1.5 text-xs',
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
    'inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
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
