'use client'

import { AuthPayload } from '@/types'

interface AuthTabProps {
  authData: AuthPayload
  loading: boolean
  onAuthDataChange: (data: AuthPayload) => void
  onSignIn: () => void
}

export function AuthTab({
  authData,
  loading,
  onAuthDataChange,
  onSignIn,
}: AuthTabProps) {
  return (
    <section className="card grid max-w-lg gap-3">
      <h2 className="text-lg font-semibold">Sign In</h2>

      <input
        type="text"
        placeholder="chatId"
        value={authData.chatId}
        onChange={(e) =>
          onAuthDataChange({ ...authData, chatId: e.target.value })
        }
        className="input"
      />

      <input
        type="text"
        placeholder="botToken"
        value={authData.botToken}
        onChange={(e) =>
          onAuthDataChange({ ...authData, botToken: e.target.value })
        }
        className="input"
      />

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={authData.isChannel}
          onChange={(e) =>
            onAuthDataChange({ ...authData, isChannel: e.target.checked })
          }
        />
        <span>Is Channel</span>
      </label>

      <button
        type="button"
        onClick={onSignIn}
        className="button-primary"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Sign In'}
      </button>
    </section>
  )
}