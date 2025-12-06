/**
 * Export utility for generating CSV and PDF reports
 */

import { Parser } from 'json2csv';

/**
 * Export applications to CSV
 */
export const exportApplicationsToCSV = (applications) => {
  const fields = [
    { label: 'Application ID', value: '_id' },
    { label: 'Candidate Name', value: 'userId.name' },
    { label: 'Email', value: 'userId.email' },
    { label: 'Phone', value: 'userId.phone' },
    { label: 'Job Title', value: 'jobId.title' },
    { label: 'Company', value: 'jobId.company' },
    { label: 'Location', value: 'jobId.location' },
    { label: 'Status', value: 'status' },
    { label: 'Match Score', value: 'matchScore' },
    { label: 'Applied Date', value: 'createdAt' },
    { label: 'Last Updated', value: 'updatedAt' },
  ];
  
  const parser = new Parser({ fields });
  const csv = parser.parse(applications);
  
  return csv;
};

/**
 * Download CSV file in browser
 */
export const downloadCSV = (csvData, filename = 'applications.csv') => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Export interviews to CSV
 */
export const exportInterviewsToCSV = (interviews) => {
  const fields = [
    { label: 'Interview ID', value: '_id' },
    { label: 'Candidate', value: 'applicationId.userId.name' },
    { label: 'Job Title', value: 'applicationId.jobId.title' },
    { label: 'Interview Type', value: 'type' },
    { label: 'Scheduled At', value: 'scheduledAt' },
    { label: 'Duration (mins)', value: 'duration' },
    { label: 'Location', value: 'location' },
    { label: 'Status', value: 'status' },
    { label: 'Rating', value: 'rating' },
  ];
  
  const parser = new Parser({ fields });
  const csv = parser.parse(interviews);
  
  return csv;
};

/**
 * Generate summary statistics for export
 */
export const generateApplicationSummary = (applications) => {
  const summary = {
    total: applications.length,
    byStatus: {},
    avgMatchScore: 0,
    topSkills: {},
  };
  
  let totalScore = 0;
  
  applications.forEach((app) => {
    // Count by status
    summary.byStatus[app.status] = (summary.byStatus[app.status] || 0) + 1;
    
    // Calculate average match score
    if (app.matchScore) {
      totalScore += app.matchScore;
    }
    
    // Count top skills
    if (app.resumeId?.parsedData?.skills) {
      app.resumeId.parsedData.skills.forEach((skill) => {
        summary.topSkills[skill] = (summary.topSkills[skill] || 0) + 1;
      });
    }
  });
  
  summary.avgMatchScore = applications.length > 0 ? (totalScore / applications.length).toFixed(2) : 0;
  
  // Sort top skills
  summary.topSkills = Object.entries(summary.topSkills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {});
  
  return summary;
};

/**
 * Format date for export
 */
export const formatDateForExport = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default {
  exportApplicationsToCSV,
  downloadCSV,
  exportInterviewsToCSV,
  generateApplicationSummary,
  formatDateForExport,
};
