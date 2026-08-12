import { useEffect, useState } from 'react'
import { IconShieldCheck, IconUser } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

export default function Team() {
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTeam()
  }, [])

  async function loadTeam() {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })
      if (fetchError) throw fetchError
      setMembers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <h1 className="font-display text-2xl font-bold mb-6">Team</h1>

      {error && <p className="text-danger-600 text-sm mb-4">{error}</p>}

      {members === null ? (
        <p className="text-ink-600 text-sm">Loading…</p>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] p-10 text-center text-ink-600">
          No team members found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 bg-white rounded-[var(--radius-card)] px-5 py-4"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium font-display ${
                  member.role === 'supervisor' ? 'bg-forest-600' : 'bg-ink-400'
                }`}
              >
                {member.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-ink-900">
                  {member.full_name || 'Unnamed user'}
                </p>
                <p className="text-ink-600 text-xs">
                  Joined {new Date(member.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  member.role === 'supervisor'
                    ? 'bg-forest-600/10 text-forest-600'
                    : 'bg-sage-100 text-ink-600'
                }`}
              >
                {member.role === 'supervisor' ? (
                  <IconShieldCheck size={14} />
                ) : (
                  <IconUser size={14} />
                )}
                {member.role === 'supervisor' ? 'Supervisor' : 'Operator'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
