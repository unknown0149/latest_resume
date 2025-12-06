import clsx from 'clsx'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  isLoading = false,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--rg-accent)] focus-visible:ring-offset-[var(--rg-bg)] shadow-sm'
  
  const variants = {
    primary: 'bg-[var(--rg-accent)] text-white border border-[var(--rg-accent-strong)] shadow-[0_15px_30px_rgba(31,122,236,0.22)] hover:shadow-[0_18px_36px_rgba(31,122,236,0.26)] hover:-translate-y-0.5',
    secondary: 'bg-[var(--rg-surface-alt)] text-[var(--rg-text-primary)] border border-[var(--rg-border)] hover:border-[var(--rg-border-strong)] hover:-translate-y-0.5',
    outline: 'border border-[var(--rg-border)] text-[var(--rg-text-primary)] bg-[var(--rg-surface)] hover:bg-[var(--rg-bg-muted)]/60',
    ghost: 'text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] hover:bg-[var(--rg-bg-muted)]/60',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.7 text-base',
    lg: 'px-8 py-3.25 text-lg',
    xl: 'px-10 py-4 text-xl',
  }

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : children}
    </button>
  )
}

export default Button
