import React from 'react'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      {icon && <div className="mb-4 text-gray-600">{icon}</div>}
      <h3 className="text-xl font-semibold text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 max-w-md">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
