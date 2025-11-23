import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Bell, Shield, Trash2 } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const SettingsPage = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    roadmapReminders: true,
    newRoles: false,
    weeklyDigest: true,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-lg text-gray-600">Manage your account and preferences</p>
          </motion.div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue="John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="john.doe@email.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <Button>Save Changes</Button>
                </div>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Receive notifications about this
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Security</h2>
                </div>
                <div className="space-y-4">
                  <Button variant="outline">
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border-red-200">
                <div className="flex items-center gap-3 mb-6">
                  <Trash2 className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">Danger Zone</h2>
                </div>
                <p className="text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="danger">
                  Delete Account
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default SettingsPage
