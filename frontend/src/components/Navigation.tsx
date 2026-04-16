'use client'

import { TAB_IDS } from '@/lib/constants'

type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS]

interface NavigationProps {
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: TAB_IDS.DASHBOARD, label: 'Dashboard' },
  { id: TAB_IDS.AUTH, label: 'Auth' },
  { id: TAB_IDS.IMAGES, label: 'Images' },
  { id: TAB_IDS.QUIZZES, label: 'Quizzes' },
  { id: TAB_IDS.JOBS, label: 'Jobs' },
]

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/50">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-2 p-3">
        {TABS.map(({ id, label }) => (
          <TabButton
            key={id}
            isActive={activeTab === id}
            label={label}
            onClick={() => onTabChange(id)}
          />
        ))}
      </div>
    </nav>
  )
}

interface TabButtonProps {
  isActive: boolean
  label: string
  onClick: () => void
}

function TabButton({ isActive, label, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-lg border text-sm font-semibold transition',
        isActive
          ? 'border-cyan-400/70 text-cyan-300 bg-cyan-500/10'
          : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500',
      ].join(' ')}
    >
      {label}
    </button>
  )
}