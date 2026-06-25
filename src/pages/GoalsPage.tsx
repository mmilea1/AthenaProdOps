import { useState, useMemo } from 'react'
import {
  useGoals,
  isGoalMet,
  isGoalMissed,
  needsAttention,
  isLate,
  daysLeft,
  GOAL_DAYS,
  type ScopingFeature,
} from '../hooks/useGoals'

const STORAGE_KEY = 'goalsTrackingSince'

function getStoredDate(): string {
  return localStorage.getItem(STORAGE_KEY) ?? new Date().toISOString().split('T')[0]
}

type SortField = 'release' | 'created' | 'daysTaken' | 'scopingStatus' | 'goal' | null
type SortDir = 'asc' | 'desc'

function goalOrder(f: ScopingFeature): number {
  if (isLate(f)) return 0
  if (isGoalMissed(f)) return 1
  if (needsAttention(f)) return 2
  if (isGoalMet(f)) return 3
  return 4
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function GoalBadge({ feature }: { feature: ScopingFeature }) {
  if (isGoalMet(feature)) return <span className="text-green-500 text-base">✓</span>
  if (isGoalMissed(feature)) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">✗ Missed</span>
  }
  if (isLate(feature)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <span className="text-[11px]">⏰</span>Late · {Math.abs(daysLeft(feature))}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <span className="text-[11px]">🕐</span>{daysLeft(feature)}d left
    </span>
  )
}

function ScopingStatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300">—</span>
  const styles: Record<string, string> = {
    'Scoped-Supported':     'bg-green-100 text-green-800 border border-green-200',
    'Scoped-Not Supported': 'bg-red-100 text-red-800 border border-red-200',
    'In Scoping':           'bg-amber-100 text-amber-800 border border-amber-200',
    'Deferred Scoping':     'bg-purple-100 text-purple-800 border border-purple-200',
    'Needs Scoping':        'bg-gray-100 text-gray-600 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      {status}
    </span>
  )
}

function SortIcon({ active, dir, hovered }: { active: boolean; dir: SortDir; hovered: boolean }) {
  if (!active && !hovered) return null
  return (
    <span className={`ml-1 text-[10px] ${active ? 'opacity-60' : 'opacity-25'}`}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

function AttentionTable({ features }: { features: ScopingFeature[] }) {
  const urgent = features.filter((f) => needsAttention(f) || isLate(f))
  if (!urgent.length) return null

  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-red-100 bg-red-50/60 flex items-center gap-2">
        <span className="text-red-500 text-sm">▲</span>
        <span className="font-semibold text-gray-900 text-sm">Needs Your Attention</span>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{urgent.length}</span>
      </div>
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col style={{ width: '52%' }} /><col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} /><col style={{ width: '18%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {['Feature', 'Created', 'Days Used', 'Days Left'].map((h) => (
              <th key={h} className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {urgent.map((f, i) => (
            <tr key={f.id} onClick={() => f.url !== '#' && window.open(f.url, '_blank')}
              className={`${i !== urgent.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-red-50/30 cursor-pointer transition-colors`}>
              <td className="px-5 py-3.5">
                <div className="font-medium text-gray-800 truncate">{f.summary}</div>
                <a href={f.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:underline text-xs mt-0.5 inline-block">{f.key}</a>
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-sm">{formatDate(f.created)}</td>
              <td className="px-5 py-3.5 text-gray-700 text-sm font-medium">{f.businessDaysTaken}d</td>
              <td className="px-5 py-3.5">
                <span className={`text-sm font-semibold ${isLate(f) ? 'text-red-600' : 'text-amber-600'}`}>
                  {isLate(f) ? `Overdue · ${Math.abs(daysLeft(f))}d` : `${daysLeft(f)}d remaining`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FeaturesTable({ features, isNew }: { features: ScopingFeature[]; isNew: boolean }) {
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hoveredCol, setHoveredCol] = useState<SortField>(null)

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortField) return features
    return [...features].sort((a, b) => {
      let cmp = 0
      if (sortField === 'release') cmp = (a.targetRelease ?? '').localeCompare(b.targetRelease ?? '')
      else if (sortField === 'created') cmp = new Date(a.created).getTime() - new Date(b.created).getTime()
      else if (sortField === 'daysTaken') cmp = a.businessDaysTaken - b.businessDaysTaken
      else if (sortField === 'scopingStatus') cmp = (a.scopingStatus ?? '').localeCompare(b.scopingStatus ?? '')
      else if (sortField === 'goal') cmp = goalOrder(a) - goalOrder(b)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [features, sortField, sortDir])

  const thBase = 'text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide select-none'
  const thSort = `${thBase} cursor-pointer hover:text-gray-700`

  const Th = ({ field, label }: { field: SortField; label: string }) => (
    <th className={thSort} onClick={() => handleSort(field)}
      onMouseEnter={() => setHoveredCol(field)} onMouseLeave={() => setHoveredCol(null)}>
      {label}<SortIcon active={sortField === field} dir={sortDir} hovered={hoveredCol === field} />
    </th>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="font-semibold text-gray-900 text-sm">
          {isNew ? 'New Features' : 'Historic Features'}
        </span>
        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
          {features.length}
        </span>
        {!isNew && (
          <span className="ml-1 text-xs text-gray-400">· before you took over this zone</span>
        )}
      </div>
      {features.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="text-gray-400 text-sm">
            {isNew
              ? 'No new features created since your tracking start date.'
              : 'No historic features found.'}
          </div>
          {isNew && (
            <div className="text-gray-300 text-xs mt-1">New features will appear here as they are created in Jira.</div>
          )}
        </div>
      ) : (
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '36%' }} /><col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
            <col style={{ width: '18%' }} /><col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className={thBase}>Feature</th>
              <Th field="release" label="Release" />
              <Th field="created" label="Created" />
              <Th field="daysTaken" label="Days Taken" />
              <Th field="scopingStatus" label="Scoping Status" />
              <Th field="goal" label="Goal" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <tr key={f.id} onClick={() => f.url !== '#' && window.open(f.url, '_blank')}
                className={`${i !== sorted.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-indigo-50/40 cursor-pointer transition-colors`}>
                <td className="px-4 py-3.5">
                  <div className="font-medium text-gray-800 truncate">{f.summary}</div>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:underline text-xs mt-0.5 inline-block">{f.key}</a>
                </td>
                <td className="px-4 py-3.5 text-gray-600 text-sm">{f.targetRelease ?? '—'}</td>
                <td className="px-4 py-3.5 text-gray-500 text-sm">{formatDate(f.created)}</td>
                <td className="px-4 py-3.5 text-gray-700 text-sm font-medium">
                  {f.businessDaysTaken}d
                  {f.scopedAt && <span className="block text-[11px] text-gray-400 font-normal">scoped {formatDate(f.scopedAt)}</span>}
                </td>
                <td className="px-4 py-3.5"><ScopingStatusPill status={f.scopingStatus} /></td>
                <td className="px-4 py-3.5"><GoalBadge feature={f} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ScopingProgressBar({ features, isNew }: { features: ScopingFeature[]; isNew: boolean }) {
  if (features.length === 0 && !isNew) return null
  const scoped = features.filter((f) => isGoalMet(f)).length
  const pct = features.length === 0 ? 0 : Math.round((scoped / features.length) * 100)
  const target = 90

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="font-semibold text-gray-900 text-base">Feature Scoping · {GOAL_DAYS}-Day Goal</div>
          <div className="text-gray-400 text-xs mt-0.5">Features must be scoped within {GOAL_DAYS} business days of creation</div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${features.length === 0 ? 'text-gray-300' : pct >= target ? 'text-green-600' : 'text-red-600'}`}>
            {features.length === 0 ? '—' : `${pct}%`}
          </div>
          <div className="text-gray-400 text-xs mt-0.5">
            {features.length === 0 ? 'No features yet' : `${scoped} of ${features.length} features`}
          </div>
        </div>
      </div>
      <div className="relative mt-4 mb-2">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          {features.length > 0 && (
            <div className={`h-full rounded-full transition-all ${pct >= target ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
          )}
        </div>
        <div className="absolute top-0 h-3 w-px bg-gray-400" style={{ left: `${Math.min(target, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>0%</span>
        <span>{target}% target</span>
      </div>
    </div>
  )
}

function FieldCompletionGoal() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
      <div className="text-2xl mb-2">🚧</div>
      <div className="font-semibold text-gray-700 mb-1">Coming Soon</div>
      <div className="text-sm text-gray-400 max-w-sm mx-auto">
        Tracks that 90% of features have relevant fields completed within 2 business days of a feature status change.
      </div>
    </div>
  )
}

const GOAL_TABS = [
  { id: 'scoping', label: '14-Day Scoping' },
  { id: 'fields',  label: '2-Day Field Completion' },
] as const
type GoalTab = typeof GOAL_TABS[number]['id']

export function GoalsPage() {
  const [activeTab, setActiveTab] = useState<GoalTab>('scoping')
  const [showDemo, setShowDemo] = useState(false)
  const [view, setView] = useState<'new' | 'historic'>('new')
  const [trackingSince, setTrackingSince] = useState(getStoredDate)
  const [editingDate, setEditingDate] = useState(false)
  const [dateInput, setDateInput] = useState(getStoredDate)

  const { features, loading, error, refresh } = useGoals(showDemo, trackingSince)

  const newFeatures = useMemo(
    () => features.filter((f) => f.created >= trackingSince),
    [features, trackingSince]
  )
  const historicFeatures = useMemo(
    () => features.filter((f) => f.created < trackingSince),
    [features, trackingSince]
  )

  const activeFeatures = view === 'new' ? newFeatures : historicFeatures

  const lastUpdated = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })

  function saveDate() {
    localStorage.setItem(STORAGE_KEY, dateInput)
    setTrackingSince(dateInput)
    setEditingDate(false)
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goal Tracker</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">Data as of {lastUpdated}</p>}
        </div>
        {activeTab === 'scoping' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDemo((d) => !d)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showDemo ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showDemo ? '× Hide demo' : '+ Show demo'}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#2D1B69' }}
            >
              <span className={loading ? 'animate-spin inline-block' : 'inline-block'}>↺</span>
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Goal tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {GOAL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'fields' && <FieldCompletionGoal />}
      {activeTab === 'scoping' && (
        <>
      {/* Tracking since + view toggle */}
      <div className="flex items-center gap-4 mb-6">
        {/* New / Historic toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setView('new')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'new' ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            style={view === 'new' ? { backgroundColor: '#2D1B69' } : undefined}
          >
            New Features
            <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold ${
              view === 'new' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {newFeatures.length}
            </span>
          </button>
          <button
            onClick={() => setView('historic')}
            className={`px-4 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ${
              view === 'historic' ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            style={view === 'historic' ? { backgroundColor: '#2D1B69' } : undefined}
          >
            Historic
            <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold ${
              view === 'historic' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {historicFeatures.length}
            </span>
          </button>
        </div>

        {/* Tracking since date */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-xs text-gray-400">Tracking since</span>
          {editingDate ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button onClick={saveDate} className="text-xs font-medium text-white px-2 py-1 rounded" style={{ backgroundColor: '#2D1B69' }}>Save</button>
              <button onClick={() => { setEditingDate(false); setDateInput(trackingSince) }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50 transition-colors"
            >
              {formatDate(trackingSince)} ✎
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading features from Jira...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6">
          <strong>Failed to load:</strong> {error}
        </div>
      )}

      {!loading && (
        <>
          <ScopingProgressBar features={activeFeatures} isNew={view === 'new'} />
          {view === 'new' && <AttentionTable features={activeFeatures} />}
          <FeaturesTable features={activeFeatures} isNew={view === 'new'} />
        </>
      )}
        </>
      )}
    </div>
  )
}
