interface Props {
  name: string
  category: string
}

const categoryStyles: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700',
  'Done': 'bg-green-50 text-green-700',
  'To Do': 'bg-gray-100 text-gray-500',
}

export function StatusBadge({ name, category }: Props) {
  const style = categoryStyles[category] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {name}
    </span>
  )
}
