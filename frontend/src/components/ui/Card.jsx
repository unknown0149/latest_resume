import clsx from 'clsx'

const Card = ({ 
  children, 
  className = '', 
  hover = false,
  gradient = false,
  ...props 
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 p-6',
        hover && 'card-hover cursor-pointer',
        gradient && 'bg-gradient-to-br from-blue-50 to-purple-50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
