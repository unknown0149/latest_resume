import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-[var(--rg-surface)] text-[var(--rg-text-primary)] border-t border-[var(--rg-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--rg-accent)] text-white flex items-center justify-center shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M7 9L12 14L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xl font-bold">Resume Genie</span>
            </Link>
            <p className="text-[var(--rg-text-secondary)] max-w-sm">
              Transform your career with AI-powered resume optimization. Get personalized insights and land your dream job.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--rg-text-primary)]">Product</h4>
            <ul className="space-y-2">
              <li><Link to="/upload" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">Upload Resume</Link></li>
              <li><Link to="/dashboard" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">Dashboard</Link></li>
              <li><Link to="/" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">Features</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--rg-text-primary)]">Company</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">About Us</a></li>
              <li><a href="#" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">Blog</a></li>
              <li><a href="#" className="text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--rg-border)] text-center text-[var(--rg-text-secondary)] text-sm">
          <p>&copy; 2025 Resume Genie. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
