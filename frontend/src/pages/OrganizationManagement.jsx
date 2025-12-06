import { useState, useEffect } from 'react'
import { Building2, Users, Settings, Plus, Edit2, Trash2, Shield, Crown } from 'lucide-react'
import api from '../services/api'

export default function OrganizationManagement() {
  const [organization, setOrganization] = useState(null)
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchOrganizationData()
  }, [])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      
      // First get list of organizations, then get details
      const orgsRes = await api.get('/organizations')
      const orgs = orgsRes.data.organizations || []
      
      if (orgs.length === 0) {
        setError('No organization found. Please create one first.')
        setLoading(false)
        return
      }
      
      // Get first org details (or user's default org)
      const org = orgs[0]
      setOrganization(org)
      setMembers(org.members || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    if (!organization) return
    
    try {
      await api.post(`/organizations/${organization.slug}/members`, {
        email: inviteEmail,
        role: inviteRole
      })
      setSuccessMessage(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('member')
      fetchOrganizationData() // Refresh data
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    if (!organization) return
    
    try {
      await api.delete(`/organizations/${organization.slug}/members/${memberId}`)
      setMembers(members.filter(m => m.userId?._id !== memberId && m.userId !== memberId))
      setSuccessMessage('Member removed successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member')
    }
  }

  const handleUpdateRole = async (memberId, newRole) => {
    if (!organization) return
    
    try {
      await api.put(`/organizations/${organization.slug}/members/${memberId}`, { 
        role: newRole,
        permissions: [] // Can be customized based on role
      })
      setMembers(members.map(m => 
        (m.userId?._id === memberId || m.userId === memberId) ? { ...m, role: newRole } : m
      ))
      setSuccessMessage('Role updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role')
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-500" />
      default:
        return <Users className="w-4 h-4 text-blue-500" />
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'recruiter':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {organization?.name || 'Your Organization'}
                </p>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Organization Info */}
        {organization && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <p className="text-lg text-gray-900">{organization.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Members</label>
                <p className="text-lg text-gray-900">{members.length}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                <p className="text-lg text-gray-900 capitalize">{organization.subscriptionPlan || 'Free'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Team Member</h2>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Send Invitation</span>
            </button>
          </form>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Team Members ({members.length})</h2>
          </div>

          {members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members yet. Invite your first member above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => {
                    // Handle both populated and unpopulated userId
                    const user = member.userId || member
                    const userId = user._id || user
                    const userName = user.name || 'Unknown User'
                    const userEmail = user.email || 'No email'
                    
                    return (
                    <tr key={member._id || userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {userName.charAt(0) || userEmail.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                            {member.role || 'member'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joinedAt || member.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {member.role !== 'owner' && (
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                const newRole = prompt('Enter new role (member/recruiter/admin):', member.role)
                                if (newRole && ['member', 'recruiter', 'admin'].includes(newRole)) {
                                  handleUpdateRole(userId, newRole)
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleRemoveMember(userId)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                        {member.role === 'owner' && (
                          <span className="text-gray-400 text-xs">Cannot modify owner</span>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
