import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, BookmarkCheck, FolderOpen, Tag, Calendar, 
  Briefcase, CheckCircle2, XCircle, Clock, Search, Filter,
  Trash2, Edit, ExternalLink, MapPin, DollarSign
} from 'lucide-react';
import axiosInstance from '../services/api';

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
    fetchCollections();
  }, [selectedCollection, selectedStatus]);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCollection !== 'all') params.collection = selectedCollection;
      if (selectedStatus !== 'all') params.applicationStatus = selectedStatus;
      
      const response = await axiosInstance.get('/saved-jobs', { params });
      setSavedJobs(response.data.savedJobs);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await axiosInstance.get('/saved-jobs/collections');
      setCollections(response.data.collections);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleRemoveSavedJob = async (id) => {
    if (!confirm('Remove this job from saved?')) return;
    
    try {
      await axiosInstance.delete(`/saved-jobs/${id}`);
      setSavedJobs(savedJobs.filter(job => job._id !== id));
    } catch (error) {
      console.error('Error removing saved job:', error);
      alert('Failed to remove job');
    }
  };

  const handleMarkAsApplied = async (id) => {
    try {
      await axiosInstance.post(`/saved-jobs/${id}/mark-applied`);
      fetchSavedJobs();
    } catch (error) {
      console.error('Error marking as applied:', error);
      alert('Failed to update status');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosInstance.put(`/saved-jobs/${id}/application-status`, { status });
      fetchSavedJobs();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'applied': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'interviewing': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'offered': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Bookmark className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredJobs = savedJobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.jobId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobId?.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Jobs</h1>
          <p className="text-gray-600">Manage your bookmarked opportunities</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Collection Filter */}
            <div>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Collections</option>
                {collections.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="not_applied">Not Applied</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offered">Offered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Saved</p>
                <p className="text-2xl font-bold text-gray-900">{savedJobs.length}</p>
              </div>
              <Bookmark className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Applied</p>
                <p className="text-2xl font-bold text-blue-600">
                  {savedJobs.filter(j => j.applied).length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Interviewing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {savedJobs.filter(j => j.applicationStatus === 'interviewing').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collections</p>
                <p className="text-2xl font-bold text-purple-600">{collections.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved jobs</h3>
            <p className="text-gray-600 mb-4">Start bookmarking jobs you're interested in</p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((savedJob) => (
              <div key={savedJob._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(savedJob.applicationStatus)}
                      <h3 className="text-xl font-semibold text-gray-900">
                        {savedJob.jobId?.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {savedJob.jobId?.company?.name || 'Company'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {savedJob.jobId?.location?.city || 'Remote'}
                      </span>
                      {savedJob.jobId?.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {savedJob.jobId.salary.min}-{savedJob.jobId.salary.max} {savedJob.jobId.salary.currency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`/jobs/${savedJob.jobId._id}`, '_blank')}
                      className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                      title="View job"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveSavedJob(savedJob._id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {savedJob.notes && (
                  <p className="text-sm text-gray-600 mb-3">{savedJob.notes}</p>
                )}

                {savedJob.tags && savedJob.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    {savedJob.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Saved {new Date(savedJob.createdAt).toLocaleDateString()}
                  </div>
                  
                  {!savedJob.applied ? (
                    <button
                      onClick={() => handleMarkAsApplied(savedJob._id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Mark as Applied
                    </button>
                  ) : (
                    <select
                      value={savedJob.applicationStatus}
                      onChange={(e) => handleUpdateStatus(savedJob._id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;
