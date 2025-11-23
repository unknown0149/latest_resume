import { createContext, useContext, useState } from 'react'

const ResumeContext = createContext()

export const useResumeContext = () => {
  const context = useContext(ResumeContext)
  if (!context) {
    throw new Error('useResumeContext must be used within ResumeProvider')
  }
  return context
}

export const ResumeProvider = ({ children }) => {
  const [uploadedResume, setUploadedResume] = useState(null)
  const [parsedResume, setParsedResume] = useState(null)
  const [predictedRoles, setPredictedRoles] = useState([])
  const [matchedJobs, setMatchedJobs] = useState([])
  const [skillGaps, setSkillGaps] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [resources, setResources] = useState([])
  const [salaryBoost, setSalaryBoost] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const resetAnalysis = () => {
    setParsedResume(null)
    setPredictedRoles([])
    setMatchedJobs([])
    setSkillGaps([])
    setRoadmap(null)
    setResources([])
    setSalaryBoost([])
  }

  const value = {
    uploadedResume,
    setUploadedResume,
    parsedResume,
    setParsedResume,
    predictedRoles,
    setPredictedRoles,
    matchedJobs,
    setMatchedJobs,
    skillGaps,
    setSkillGaps,
    roadmap,
    setRoadmap,
    resources,
    setResources,
    salaryBoost,
    setSalaryBoost,
    isAnalyzing,
    setIsAnalyzing,
    resetAnalysis,
  }

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  )
}
