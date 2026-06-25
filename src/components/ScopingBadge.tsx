interface Props {
  value: string | null
}

const config: Record<string, { style: string; icon: string }> = {
  'Scoped-Supported': {
    style: 'bg-green-100 text-green-800 border border-green-200',
    icon: '✅',
  },
  'Scoped-Not Supported': {
    style: 'bg-red-100 text-red-800 border border-red-200',
    icon: '❌',
  },
  'In Scoping': {
    style: 'bg-amber-100 text-amber-800 border border-amber-200',
    icon: '⚠',
  },
}

export function ScopingBadge({ value }: Props) {
  if (!value) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
        Not Set
      </span>
    )
  }

  const { style, icon } = config[value] ?? { style: 'bg-gray-100 text-gray-600 border border-gray-200', icon: '' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      <span className="text-[11px] leading-none">{icon}</span>
      {value}
    </span>
  )
}
