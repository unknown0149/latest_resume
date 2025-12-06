/**
 * Quiz Service - MCQ Generation and Assessment
 * Handles quiz generation, submission, and scoring
 */

import crypto from 'crypto';
import Quiz from '../models/Quiz.js';
import Resume from '../models/Resume.js';
import { logger } from '../utils/logger.js';
import { generateQuizQuestions } from './aiRouter.js';
import { determineBadge } from '../utils/badgeUtils.js';
import { notifyQuizCompleted } from './notificationService.js';

/**
 * Generate a new MCQ quiz for a skill
 */
export async function generateMCQQuiz(resumeId, skillName, options = {}) {
  try {
    const {
      difficulty = 'Intermediate',
      questionCount = 5,
      timeLimit = 30, // minutes
      userId = null
    } = options;
    
    logger.info(`Generating quiz: ${skillName} (${difficulty}) for resume ${resumeId}`);
    
    // Generate quiz ID
    const quizId = crypto.randomBytes(16).toString('hex');
    
    // Generate questions using AI Router (HuggingFace or rule-based)
    const questionsResult = await generateQuizQuestions(skillName, difficulty, questionCount);
    
    if (!questionsResult.success) {
      throw new Error('Failed to generate quiz questions');
    }
    
    // Create quiz document
    const quiz = new Quiz({
      quizId: quizId,
      resumeId: resumeId,
      userId: userId,
      skillName: skillName,
      difficulty: difficulty,
      questions: questionsResult.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || difficulty,
        userAnswer: null,
        isCorrect: false,
        timeSpent: 0
      })),
      totalQuestions: questionsResult.questions.length,
      timeLimit: timeLimit,
      status: 'generated',
      metadata: {
        provider: questionsResult.provider,
        model: questionsResult.model,
        questionsFrom: questionsResult.provider === 'huggingface' ? 'ai' : 'rule-based'
      }
    });
    
    await quiz.save();
    
    logger.info(`Quiz ${quizId} created successfully with ${quiz.questions.length} questions`);
    
    // Return quiz without correct answers (for frontend)
    return {
      success: true,
      quizId: quiz.quizId,
      skillName: quiz.skillName,
      difficulty: quiz.difficulty,
      totalQuestions: quiz.totalQuestions,
      timeLimit: quiz.timeLimit,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty
        // Note: correctAnswer and explanation NOT sent to frontend
      })),
      metadata: {
        provider: quiz.metadata.provider,
        createdAt: quiz.createdAt
      }
    };
    
  } catch (error) {
    logger.error('Quiz generation failed:', error);
    throw error;
  }
}

/**
 * Start a quiz (mark as in-progress)
 */
export async function startQuiz(quizId) {
  try {
    const quiz = await Quiz.findOne({ quizId: quizId });
    
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    if (quiz.status !== 'generated') {
      throw new Error(`Quiz already ${quiz.status}`);
    }
    
    quiz.status = 'in-progress';
    quiz.startedAt = new Date();
    await quiz.save();
    
    logger.info(`Quiz ${quizId} started`);
    
    return {
      success: true,
      quizId: quiz.quizId,
      startedAt: quiz.startedAt,
      timeLimit: quiz.timeLimit
    };
    
  } catch (error) {
    logger.error('Failed to start quiz:', error);
    throw error;
  }
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuiz(quizId, answers) {
  try {
    const quiz = await Quiz.findOne({ quizId: quizId });
    
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    if (quiz.status === 'completed') {
      throw new Error('Quiz already completed');
    }
    
    logger.info(`Submitting quiz ${quizId} with ${answers.length} answers`);
    
    // Process answers
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      
      if (question) {
        question.userAnswer = answer.selectedAnswer;
        question.isCorrect = question.correctAnswer === answer.selectedAnswer;
        question.timeSpent = answer.timeSpent || 0;
      }
    }
    
    // Calculate total time spent
    quiz.timeSpent = quiz.questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
    
    // Calculate score and feedback
    quiz.calculateResults();
    
    // Update status
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    
    await quiz.save();
    
    logger.info(`Quiz ${quizId} completed: Score ${quiz.score}%`);
    
    // ====================================================================
    // UPDATE RESUME VERIFICATION STATUS
    // ====================================================================
    try {
      const resume = await Resume.findOne({ resumeId: quiz.resumeId, isActive: true });
      
      if (resume) {
        // Initialize profile and skillVerifications if needed
        if (!resume.profile) {
          resume.profile = {};
        }
        if (!Array.isArray(resume.profile.skillVerifications)) {
          resume.profile.skillVerifications = [];
        }
        
        // Determine badge based on score
        const badge = determineBadge(quiz.score);
        
        // Check if verification already exists
        const existingIndex = resume.profile.skillVerifications.findIndex(
          v => v.skill?.toLowerCase() === quiz.skillName.toLowerCase()
        );
        
        const verificationData = {
          skill: quiz.skillName,
          score: quiz.score,
          correct: quiz.correctAnswers,
          total: quiz.totalQuestions,
          verified: quiz.score >= 70,
          lastVerifiedAt: quiz.completedAt,
          badge: {
            level: badge.level,
            label: badge.label,
            awardedAt: quiz.completedAt
          }
        };
        
        if (existingIndex >= 0) {
          // Update existing verification
          resume.profile.skillVerifications[existingIndex] = verificationData;
        } else {
          // Add new verification
          resume.profile.skillVerifications.push(verificationData);
        }
        
        // Also sync with customSkills if exists
        if (!Array.isArray(resume.profile.customSkills)) {
          resume.profile.customSkills = [];
        }
        
        const skillIndex = resume.profile.customSkills.findIndex(
          s => s.name?.toLowerCase() === quiz.skillName.toLowerCase()
        );
        
        if (skillIndex >= 0) {
          resume.profile.customSkills[skillIndex] = {
            ...resume.profile.customSkills[skillIndex],
            verified: verificationData.verified,
            score: verificationData.score,
            lastVerifiedAt: verificationData.lastVerifiedAt,
            badge: verificationData.badge,
          };
        } else {
          resume.profile.customSkills.push({
            name: quiz.skillName,
            level: quiz.score,
            category: 'Technical',
            verified: verificationData.verified,
            score: verificationData.score,
            lastVerifiedAt: verificationData.lastVerifiedAt,
            badge: verificationData.badge,
          });
        }
        
        resume.markModified('profile.skillVerifications');
        resume.markModified('profile.customSkills');
        await resume.save();
        
        logger.info(`Updated resume ${quiz.resumeId} with quiz verification for ${quiz.skillName}`);
      } else {
        logger.warn(`Resume ${quiz.resumeId} not found for quiz verification update`);
      }
    } catch (resumeError) {
        logger.error('Failed to update resume verification:', resumeError);
      // Don't throw - quiz completion should still succeed
    }
    
    // Send notification to user about quiz completion
    try {
      if (resume && resume.userId) {
        const badge = determineBadge(quiz.score);
        await notifyQuizCompleted(resume.userId, quiz.skillName, quiz.score, badge);
      }
    } catch (notifError) {
      logger.error('Failed to send quiz completion notification:', notifError);
      // Don't throw - notification failure shouldn't break quiz completion
    }
    
    // Return detailed results
    return {
      success: true,
      quizId: quiz.quizId,
      skillName: quiz.skillName,
      score: quiz.score,
      correctAnswers: quiz.correctAnswers,
      totalQuestions: quiz.totalQuestions,
      timeSpent: quiz.timeSpent,
      feedback: quiz.feedback,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        explanation: q.explanation,
        timeSpent: q.timeSpent
      })),
      completedAt: quiz.completedAt
    };
    
  } catch (error) {
    logger.error('Quiz submission failed:', error);
    throw error;
  }
}

/**
 * Get quiz history for a user/resume
 */
export async function getQuizHistory(resumeId, options = {}) {
  try {
    const history = await Quiz.getHistory(resumeId, options);
    
    return {
      success: true,
      quizzes: history.map(q => ({
        quizId: q.quizId,
        skillName: q.skillName,
        difficulty: q.difficulty,
        score: q.score,
        correctAnswers: q.correctAnswers,
        totalQuestions: q.totalQuestions,
        completedAt: q.completedAt,
        feedback: q.feedback
      })),
      totalQuizzes: history.length
    };
    
  } catch (error) {
    logger.error('Failed to get quiz history:', error);
    throw error;
  }
}

/**
 * Get quiz by ID (for review)
 */
export async function getQuiz(quizId, includeAnswers = false) {
  try {
    const quiz = await Quiz.findOne({ quizId: quizId });
    
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    const result = {
      quizId: quiz.quizId,
      skillName: quiz.skillName,
      difficulty: quiz.difficulty,
      status: quiz.status,
      totalQuestions: quiz.totalQuestions,
      timeLimit: quiz.timeLimit,
      createdAt: quiz.createdAt
    };
    
    // Include questions (without answers if not completed)
    if (quiz.status === 'completed' && includeAnswers) {
      result.score = quiz.score;
      result.correctAnswers = quiz.correctAnswers;
      result.feedback = quiz.feedback;
      result.questions = quiz.questions;
      result.completedAt = quiz.completedAt;
    } else {
      result.questions = quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty
      }));
    }
    
    return {
      success: true,
      quiz: result
    };
    
  } catch (error) {
    logger.error('Failed to get quiz:', error);
    throw error;
  }
}

/**
 * Get skill statistics (average scores, improvement)
 */
export async function getSkillStats(resumeId, skillName) {
  try {
    const stats = await Quiz.getAverageScore(resumeId, skillName);
    
    if (!stats) {
      return {
        success: true,
        hasData: false,
        message: `No quiz history for ${skillName}`
      };
    }
    
    return {
      success: true,
      hasData: true,
      skillName: skillName,
      ...stats
    };
    
  } catch (error) {
    logger.error('Failed to get skill stats:', error);
    throw error;
  }
}

/**
 * Delete quiz (admin only)
 */
export async function deleteQuiz(quizId) {
  try {
    const result = await Quiz.deleteOne({ quizId: quizId });
    
    if (result.deletedCount === 0) {
      throw new Error('Quiz not found');
    }
    
    logger.info(`Quiz ${quizId} deleted`);
    
    return {
      success: true,
      message: 'Quiz deleted successfully'
    };
    
  } catch (error) {
    logger.error('Failed to delete quiz:', error);
    throw error;
  }
}

export default {
  generateMCQQuiz,
  startQuiz,
  submitQuiz,
  getQuizHistory,
  getQuiz,
  getSkillStats,
  deleteQuiz
};
