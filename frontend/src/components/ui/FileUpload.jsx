import { useState, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'

const FileUpload = ({ onFileSelect, accept = '.pdf,.doc,.docx,image/png,image/jpeg,image/jpg', maxSize = 10 }) => {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)

  const validateFile = (file) => {
    const maxSizeBytes = maxSize * 1024 * 1024
    
    // Check file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, PNG, or JPG file')
      return false
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSize}MB`)
      return false
    }

    setError(null)
    return true
  }

  const handleFileSelect = useCallback((selectedFile) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile)
      onFileSelect(selectedFile)
    }
  }, [onFileSelect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setError(null)
    onFileSelect(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
              transition-all duration-300
              ${isDragging 
                ? 'border-primary-500 bg-primary-50 scale-105' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }
            `}
          >
            <input
              type="file"
              id="file-upload"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
            />
            
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Upload className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isDragging ? 'Drop your file here' : 'Drag & Drop Your Resume'}
              </h3>
              
              <p className="text-gray-600 mb-1">or click to browse</p>
              <p className="text-sm text-gray-500 mb-6">
                PDF, DOC, DOCX, PNG, JPG (Max {maxSize}MB)
              </p>
              
              <Button type="button" onClick={() => document.getElementById('file-upload').click()}>
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 border-2 border-green-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 truncate">
                      {file.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleRemove}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>File uploaded successfully</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUpload
