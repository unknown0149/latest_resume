import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, Zap, Target, TrendingUp, CheckCircle, Clock, Star } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const LandingPage = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'AI-Powered Analysis',
      description: 'Get instant AI-driven insights about your resume and career potential',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Job Role Prediction',
      description: 'Discover the best-fit roles based on your skills and experience',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Salary Boost Tips',
      description: 'Learn what skills can increase your earning potential',
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Skill Gap Analysis',
      description: 'Identify missing skills and get personalized recommendations',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: '30/60/90 Day Roadmap',
      description: 'Follow a structured learning path to achieve your career goals',
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Course Recommendations',
      description: 'Access curated learning resources tailored to your needs',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-primary-600 text-sm font-semibold mb-6">
                <Star className="w-4 h-4 fill-current" />
                AI-Powered Career Intelligence
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your Career with{' '}
                <span className="gradient-text">Resume Genie</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Upload your resume and get AI-powered insights, personalized job recommendations, 
                skill gap analysis, and a complete career roadmap to land your dream job.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg">
                    <Upload className="w-5 h-5 mr-2" />
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-8 mt-10">
                <div>
                  <div className="text-3xl font-bold gradient-text">50K+</div>
                  <div className="text-sm text-gray-600">Resumes Analyzed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold gradient-text">95%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold gradient-text">4.9★</div>
                  <div className="text-sm text-gray-600">User Rating</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-primary rounded-full blur-2xl opacity-50"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-secondary rounded-full blur-2xl opacity-50"></div>
                
                <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      95% Match
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      $150k+
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform provides comprehensive career insights and actionable recommendations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card hover className="h-full">
                  <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to Transform Your Career?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Join thousands of professionals who have successfully landed their dream jobs
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                <Upload className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default LandingPage
