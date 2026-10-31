import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AppShell,
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  type Column,
} from '@/components/shared'
import { UserPlus, X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context'
import type { User } from '@/types/auth'

export const TeamManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'INTERNAL' as 'INTERNAL' | 'ADMIN',
    password: '',
  })

  // Fetch team members
  const { data: staffMembers = [], isLoading } = useQuery<User[]>({
    queryKey: ['staff-members'],
    queryFn: () => api.get<User[]>('/accounts/staff/'),
  })

  // Create staff mutation
  const inviteMutation = useMutation({
    mutationFn: (newStaff: typeof formData) => api.post<User>('/accounts/staff/', newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] })
      setIsInviteOpen(false)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'INTERNAL',
        password: '',
      })
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create team member.')
    },
  })

  const columns: Column<User>[] = [
    {
      header: 'Member',
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-200 text-neutral-800 font-semibold text-xs shrink-0">
            {(member.first_name || member.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 truncate">
              {member.first_name ? `${member.first_name} ${member.last_name || ''}` : member.email}
            </p>
            <p className="text-[11px] text-neutral-400 truncate">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (member) => (
        <StatusBadge
          status={member.role}
          variant={member.role === 'ADMIN' ? 'advance' : 'pro'}
        />
      ),
    },
    {
      header: 'Status',
      cell: (member) => (
        <StatusBadge
          status={member.is_active ? 'Active' : 'Inactive'}
          variant={member.is_active ? 'success' : 'overdue'}
        />
      ),
    },
    {
      header: 'Created Date',
      cell: (member) => (
        <span className="text-neutral-500">
          {new Date(member.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const filtered = staffMembers.filter(
    (m) =>
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.first_name && m.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.last_name && m.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSubmitInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (formData.password.length < 9) {
      setFormError('Password must be more than 8 characters long.')
      return
    }

    inviteMutation.mutate(formData)
  }

  return (
    <AppShell
      user={
        currentUser
          ? {
              email: currentUser.email,
              name: currentUser.first_name
                ? `${currentUser.first_name} ${currentUser.last_name || ''}`
                : currentUser.email,
              role: currentUser.role,
            }
          : undefined
      }
    >
      <PageHeader
        breadcrumb="Settings > Team"
        title="Team Members"
        subtitle="Manage administrative permissions and internal staff access to Brightloop."
        extraActions={
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-neutral-800 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Team Member</span>
          </button>
        }
      />

      <div className="space-y-4">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search team members by name or email..."
        />

        <DataTable
          columns={columns}
          data={filtered}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No team members found."
        />
      </div>

      {/* Invite Member Modal Dialog */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                Provision Team Member
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvite} className="p-5 space-y-3.5">
              {formError && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="colleague@brightloop.io"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  <option value="INTERNAL">INTERNAL (Day-to-day operations & billing)</option>
                  <option value="ADMIN">ADMIN (Full system access & staff management)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Must include upper, lower & symbol"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Must be &gt;8 characters with uppercase, lowercase, and a symbol.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111827] hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Provisioning...' : 'Provision Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
