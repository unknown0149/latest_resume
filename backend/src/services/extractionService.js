import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import fs from 'fs/promises'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { logger } from '../utils/logger.js'
import { 
  normalizeText, 
  removeHeadersFooters, 
  calculateConfidence, 
  needsOCR 
} from '../utils/textProcessor.js'

// Disable PDF.js worker for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

/**
 * Extract text from PDF using pdfjs-dist (fallback method)
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{text: string, pages: number}>}
 */
const extractFromPDFWithPdfjs = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath)
  const loadingTask = pdfjsLib.getDocument({
    data: dataBuffer,
    useSystemFonts: true,
    standardFontDataUrl: null,
    disableFontFace: true,
    verbosity: 0,
    isEvalSupported: false,
    stopAtErrors: false,
    ignoreErrors: true, // Ignore minor errors
    password: '',
    cMapUrl: null,
    cMapPacked: false
  })
  const pdfDocument = await loadingTask.promise
  
  let fullText = ''
  let successfulPages = 0
  const numPages = pdfDocument.numPages
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .filter(item => item.str && item.str.trim())
        .map(item => item.str)
        .join(' ')
      if (pageText.trim()) {
        fullText += pageText + '\n'
        successfulPages++
      }
    } catch (pageError) {
      logger.warn(`Failed to extract page ${pageNum}: ${pageError.message}`)
      // Continue with other pages
    }
  }
  
  if (successfulPages === 0) {
    throw new Error('No text content extracted from any page')
  }
  
  logger.info(`Successfully extracted text from ${successfulPages}/${numPages} pages`)
  
  return {
    text: fullText,
    pages: numPages,
  }
}

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{text: string, pages: number}>}
 */
export const extractFromPDF = async (filePath) => {
  let lastError = null;
  
  // Try pdfjs-dist first (most robust for corrupted PDFs)
  try {
    logger.info('Attempting PDF extraction with pdfjs-dist...')
    const result = await extractFromPDFWithPdfjs(filePath)
    if (result.text && result.text.trim().length > 50) {
      return result
    }
    throw new Error('Insufficient text extracted')
  } catch (pdfjsError) {
    lastError = pdfjsError
    logger.warn(`PDF.js extraction failed: ${pdfjsError.message}`)
  }
  
  // Try pdf-parse as fallback
  try {
    logger.info('Attempting PDF extraction with pdf-parse...')
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdfParse(dataBuffer, {
      max: 0, // no page limit
      version: 'v2.0.550',
      // More lenient parsing for corrupted PDFs
      pagerender: (pageData) => {
        return pageData.getTextContent({ normalizeWhitespace: true })
          .then(textContent => {
            return textContent.items.map(item => item.str).join(' ')
          })
          .catch(() => '') // Ignore page-level errors
      }
    })

    if (data.text && data.text.trim().length > 50) {
      return {
        text: data.text,
        pages: data.numpages,
      }
    }
    throw new Error('Insufficient text extracted')
  } catch (parseError) {
    logger.error(`pdf-parse extraction failed: ${parseError.message}`)
    lastError = parseError
  }
  
  // Try a more lenient approach - read with ignoreErrors
  try {
    logger.info('Attempting PDF extraction with lenient settings...')
    const dataBuffer = await fs.readFile(filePath)
    
    // Try loading with minimal validation
    const loadingTask = pdfjsLib.getDocument({
      data: dataBuffer,
      verbosity: 0,
      stopAtErrors: false,
      ignoreErrors: true,
      disableFontFace: true,
      useSystemFonts: true,
      // Skip validation that might fail on corrupted PDFs
      pdfBug: false,
      maxImageSize: -1,
      cMapUrl: null,
      cMapPacked: false
    })
    
    const pdfDoc = await loadingTask.promise
    let extractedText = ''
    
    // Try to extract from each page, ignoring errors
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map(item => item.str).join(' ')
        extractedText += pageText + '\n'
      } catch (pageErr) {
        logger.warn(`Skipping corrupted page ${i}`)
        continue
      }
    }
    
    if (extractedText.trim().length > 50) {
      return {
        text: extractedText,
        pages: pdfDoc.numPages
      }
    }
  } catch (lenientError) {
    logger.error(`Lenient PDF extraction failed: ${lenientError.message}`)
    lastError = lenientError
  }
  
  // All methods failed
  throw new Error(`Failed to extract text from PDF. The file may be corrupted, password-protected, or scanned without OCR. Please try:\n1. Re-saving the PDF from the original document\n2. Using a different PDF viewer to export/save\n3. Converting to DOCX format\n\nTechnical details: ${lastError.message}`)
}

/**
 * Extract text from DOCX file
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<{text: string, pages: number}>}
 */
export const extractFromDOCX = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath)
    const result = await mammoth.extractRawText({ buffer: dataBuffer })

    // Estimate pages (roughly 500 words per page)
    const wordCount = result.value.split(/\s+/).length
    const estimatedPages = Math.ceil(wordCount / 500)

    return {
      text: result.value,
      pages: estimatedPages,
    }
  } catch (error) {
    logger.error(`DOCX extraction failed: ${error.message}`)
    throw new Error(`Failed to extract text from DOCX: ${error.message}`)
  }
}

/**
 * Perform OCR on image file
 * @param {string} filePath - Path to image file
 * @returns {Promise<{text: string, confidence: number}>}
 */
export const performOCR = async (filePath) => {
  try {
    logger.info(`Starting OCR for file: ${filePath}`)

    // Preprocess image with sharp for better OCR results
    const processedImagePath = `${filePath}.processed.png`
    await sharp(filePath)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize histogram
      .sharpen() // Sharpen image
      .toFile(processedImagePath)

    // Perform OCR
    const { data } = await Tesseract.recognize(processedImagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    // Clean up processed image
    await fs.unlink(processedImagePath).catch(() => {})

    return {
      text: data.text,
      confidence: data.confidence,
    }
  } catch (error) {
    logger.error(`OCR failed: ${error.message}`)
    throw new Error(`Failed to perform OCR: ${error.message}`)
  }
}

/**
 * Main extraction service - orchestrates text extraction from any file type
 * @param {object} file - Multer file object
 * @returns {Promise<object>} - Extraction result
 */
export const extractText = async (file) => {
  const { path: filePath, mimetype, size, originalname } = file

  let rawText = ''
  let pages = 1
  let ocrNeeded = false
  let extractionConfidence = 0

  try {
    // Extract based on file type
    if (mimetype === 'application/pdf') {
      const result = await extractFromPDF(filePath)
      rawText = result.text
      pages = result.pages

      // Check if OCR is needed for scanned PDFs
      if (needsOCR(rawText)) {
        logger.info('PDF appears to be scanned, attempting OCR...')
        ocrNeeded = true
        // For scanned PDFs, we would need to convert PDF pages to images first
        // This is complex, so for MVP we'll just mark it and handle separately
      }
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await extractFromDOCX(filePath)
      rawText = result.text
      pages = result.pages
    } else if (mimetype.startsWith('image/')) {
      // Perform OCR on images
      const result = await performOCR(filePath)
      rawText = result.text
      ocrNeeded = true
      extractionConfidence = result.confidence
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`)
    }

    // Normalize text
    rawText = normalizeText(rawText)

    // Remove headers/footers if multi-page document
    if (pages > 1) {
      rawText = removeHeadersFooters(rawText, pages)
    }

    // Calculate confidence if not already set by OCR
    if (!extractionConfidence) {
      extractionConfidence = calculateConfidence(rawText, size)
    }

    // Validate extraction quality
    if (rawText.length < 50) {
      logger.warn(`Low text extraction: only ${rawText.length} characters extracted`)
      return {
        raw_text: rawText,
        extractedChars: rawText.length,
        pages,
        ocrNeeded: true,
        extractionConfidence,
        status: 'low_quality',
        message: 'Extracted text is very short. File may be scanned or corrupted.',
      }
    }

    logger.info(`Successfully extracted ${rawText.length} characters from ${originalname}`)

    return {
      raw_text: rawText,
      extractedChars: rawText.length,
      pages,
      ocrNeeded,
      extractionConfidence,
      status: 'completed',
    }
  } catch (error) {
    logger.error(`Extraction service failed: ${error.message}`, { filePath })
    
    return {
      raw_text: '',
      extractedChars: 0,
      pages: 0,
      ocrNeeded: false,
      extractionConfidence: 0,
      status: 'failed',
      error: error.message,
    }
  }
}

/**
 * Validate page count
 * @param {number} pages - Number of pages
 * @param {number} maxPages - Maximum allowed pages
 * @throws {Error} if page count exceeds limit
 */
export const validatePageCount = (pages, maxPages = 30) => {
  if (pages > maxPages) {
    throw new Error(`Document has ${pages} pages, but maximum allowed is ${maxPages}`)
  }
}
