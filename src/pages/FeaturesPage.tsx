import { useState } from 'react'
import { useFeatures } from '../hooks/useFeatures'
import { StatusBadge } from '../components/StatusBadge'
import { ScopingBadge } from '../components/ScopingBadge'
import type { ReleaseGroup } from '../types/jira'

type SortField = 'summary' | 'status' | 'scoping' | null
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir, hovered }: { active: boolean; dir: SortDir; hovered: boolean }) {
  if (!active && !hovered) return null
  return (
    <span className={`ml-1 text-[10px] ${active ? 'opacity-60' : 'opacity-25'}`}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

function ReleaseSection({ group }: { group: ReleaseGroup }) {
  const [collapsed, setCollapsed] = useState(false)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hoveredCol, setHoveredCol] = useState<SortField>(null)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...group.features].sort((a, b) => {
    if (!sortField) return 0
    let av = '', bv = ''
    if (sortField === 'summary') { av = a.summary; bv = b.summary }
    if (sortField === 'status') { av = a.status.name; bv = b.status.name }
    if (sortField === 'scoping') { av = a.scopingStatus ?? ''; bv = b.scopingStatus ?? '' }
    const cmp = av.localeCompare(bv)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thBase = 'text-left px-4 py-3 text-[13px] font-semibold text-gray-600 uppercase tracking-wide select-none'

  return (
    <div className="mb-8">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-3 mb-4 w-full text-left group py-1"
      >
        <span className="text-gray-400 text-sm group-hover:text-gray-600 transition-colors mt-px">
          {collapsed ? '▶' : '▼'}
        </span>
        <h2 className="text-xl font-semibold text-gray-900">
          Release {group.releaseName === 'No Release' ? 'Unassigned' : group.releaseName}
        </h2>
        <span className="text-gray-300 text-lg font-light">•</span>
        <span className="text-base font-medium text-gray-500">
          {group.features.length} {group.features.length === 1 ? 'Feature' : 'Features'}
        </span>
      </button>

      {!collapsed && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: '58%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th
                  className={`${thBase} cursor-pointer`}
                  onClick={() => handleSort('summary')}
                  onMouseEnter={() => setHoveredCol('summary')}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  Feature
                  <SortIcon active={sortField === 'summary'} dir={sortDir} hovered={hoveredCol === 'summary'} />
                </th>
                <th className={thBase}>Ticket</th>
                <th
                  className={`${thBase} cursor-pointer`}
                  onClick={() => handleSort('status')}
                  onMouseEnter={() => setHoveredCol('status')}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  Status
                  <SortIcon active={sortField === 'status'} dir={sortDir} hovered={hoveredCol === 'status'} />
                </th>
                <th
                  className={`${thBase} cursor-pointer`}
                  onClick={() => handleSort('scoping')}
                  onMouseEnter={() => setHoveredCol('scoping')}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  Scoping
                  <SortIcon active={sortField === 'scoping'} dir={sortDir} hovered={hoveredCol === 'scoping'} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((feature, idx) => (
                <tr
                  key={feature.id}
                  onClick={() => window.open(feature.url, '_blank')}
                  className={[
                    idx !== sorted.length - 1 ? 'border-b border-gray-100' : '',
                    'hover:bg-indigo-50/50 cursor-pointer transition-colors',
                  ].join(' ')}
                >
                  <td className="px-4 py-4 text-gray-800 font-medium">
                    {feature.summary}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <a
                      href={feature.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-xs"
                    >
                      {feature.key}
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge name={feature.status.name} category={feature.status.category} />
                  </td>
                  <td className="px-4 py-4">
                    <ScopingBadge value={feature.scopingStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function FeaturesPage() {
  const { groups, loading, error, refresh } = useFeatures()
  const [selectedRelease, setSelectedRelease] = useState('All Releases')

  const totalCount = groups.reduce((sum, g) => sum + g.features.length, 0)
  const displayedGroups =
    selectedRelease === 'All Releases'
      ? groups
      : groups.filter((g) => g.releaseName === selectedRelease)

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Features</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} {totalCount === 1 ? 'feature' : 'features'} assigned to you as Product Operations contact
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span className={loading ? 'animate-spin inline-block' : 'inline-block'}>↺</span>
          Refresh
        </button>
      </div>

      {/* Release filter tabs */}
      {!loading && !error && groups.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <ReleaseTab
            label="All Releases"
            count={totalCount}
            active={selectedRelease === 'All Releases'}
            onClick={() => setSelectedRelease('All Releases')}
          />
          {groups.map((g) => (
            <ReleaseTab
              key={g.releaseName}
              label={g.releaseName}
              count={g.features.length}
              active={selectedRelease === g.releaseName}
              onClick={() => setSelectedRelease(g.releaseName)}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading features from Jira...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Failed to load features:</strong> {error}
        </div>
      )}

      {!loading && !error && displayedGroups.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>No features found.</p>
        </div>
      )}

      {!loading && !error && displayedGroups.map((group) => (
        <ReleaseSection key={group.releaseName} group={group} />
      ))}
    </div>
  )
}

function ReleaseTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  const isEmpty = count === 0 && label !== 'All Releases'
  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        active
          ? 'text-white'
          : isEmpty
            ? 'bg-gray-50 text-gray-300 cursor-default'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      ].join(' ')}
      style={active ? { backgroundColor: '#2D1B69' } : undefined}
    >
      {label}
      {!isEmpty && (
        <span
          className={[
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs',
            active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600',
          ].join(' ')}
        >
          {count}
        </span>
      )}
    </button>
  )
}
