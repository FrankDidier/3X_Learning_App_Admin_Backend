const express = require('express');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const UserQuizAttempt = require('../models/UserQuizAttempt');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/quizzes
 * @desc    Get all quizzes with filtering options
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { course, difficulty, status, limit = 10, page = 1 } = req.query;
    
    // Build query
    const queryOptions = {};
    
    if (course) {
      queryOptions.course = course;
    }
    
    if (difficulty) {
      queryOptions.difficulty = difficulty;
    }
    
    if (status) {
      queryOptions.status = status;
    } else {
      // By default, only show published quizzes to regular users
      if (!req.user || !['教师', '管理员'].includes(req.user.role)) {
        queryOptions.status = '已发布';
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const quizzes = await Quiz.find(queryOptions)
      .populate('course', 'title description')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Quiz.countDocuments(queryOptions);
    
    return ApiResponse.paginate(res, quizzes, page, limit, total, '获取测验列表成功');
  } catch (err) {
    console.error('Get quizzes error:', err.message);
    return ApiResponse.error(res, '获取测验列表失败', 500);
  }
});

/**
 * @route   GET /api/quizzes/:id
 * @desc    Get quiz by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'title description')
      .populate('questions');
    
    if (!quiz) {
      return ApiResponse.notFound(res, '测验');
    }
    
    // If quiz is not published, only teachers and admins can view it
    if (quiz.status !== '已发布' && (!req.user || !['教师', '管理员'].includes(req.user.role))) {
      return ApiResponse.forbidden(res, '无权访问未发布的测验');
    }
    
    return ApiResponse.success(res, quiz, '获取测验详情成功');
  } catch (err) {
    console.error('Get quiz error:', err.message);
    return ApiResponse.error(res, '获取测验详情失败', 500);
  }
});

/**
 * @route   POST /api/quizzes
 * @desc    Create a new quiz
 * @access  Private (Teachers and Admins)
 */
router.post(
  '/',
  [
    protect,
    authorize('教师', '管理员'),
    [
      check('title', '请输入测验标题').not().isEmpty(),
      check('description', '请输入测验描述').not().isEmpty(),
      check('course', '请指定所属课程').isMongoId(),
      check('timeLimit', '请设置有效的时间限制（分钟）').isInt({ min: 1 }),
      check('passingScore', '请设置有效的通过分数（0-100）').isInt({ min: 0, max: 100 }),
      check('difficulty', '请选择有效的测验难度').isIn(['初级', '中级', '高级'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.validationError(res, errors.array());
    }
    
    try {
      const newQuiz = new Quiz({
        ...req.body,
        status: '草稿'  // Always start as a draft
      });
      
      await newQuiz.save();
      
      return ApiResponse.success(res, newQuiz, '测验创建成功', 201);
    } catch (err) {
      console.error('Create quiz error:', err.message);
      return ApiResponse.error(res, '测验创建失败', 500);
    }
  }
);

/**
 * @route   PUT /api/quizzes/:id
 * @desc    Update a quiz
 * @access  Private (Teachers and Admins)
 */
router.put(
  '/:id',
  [
    protect,
    authorize('教师', '管理员'),
    [
      check('title', '请输入测验标题').optional().not().isEmpty(),
      check('description', '请输入测验描述').optional().not().isEmpty(),
      check('course', '请指定所属课程').optional().isMongoId(),
      check('timeLimit', '请设置有效的时间限制（分钟）').optional().isInt({ min: 1 }),
      check('passingScore', '请设置有效的通过分数（0-100）').optional().isInt({ min: 0, max: 100 }),
      check('difficulty', '请选择有效的测验难度').optional().isIn(['初级', '中级', '高级']),
      check('status', '请选择有效的测验状态').optional().isIn(['草稿', '待审核', '已发布', '已下架'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.validationError(res, errors.array());
    }
    
    try {
      let quiz = await Quiz.findById(req.params.id);
      
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      // Update fields
      quiz = await Quiz.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      
      return ApiResponse.success(res, quiz, '测验更新成功');
    } catch (err) {
      console.error('Update quiz error:', err.message);
      return ApiResponse.error(res, '测验更新失败', 500);
    }
  }
);

/**
 * @route   DELETE /api/quizzes/:id
 * @desc    Delete a quiz
 * @access  Private (Teachers and Admins)
 */
router.delete(
  '/:id',
  [protect, authorize('教师', '管理员')],
  async (req, res) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      // First, delete all associated questions
      await Question.deleteMany({ quiz: quiz._id });
      
      // Then delete the quiz itself
      await quiz.remove();
      
      return ApiResponse.success(res, {}, '测验删除成功');
    } catch (err) {
      console.error('Delete quiz error:', err.message);
      return ApiResponse.error(res, '测验删除失败', 500);
    }
  }
);

/**
 * @route   POST /api/quizzes/:id/questions
 * @desc    Add a question to a quiz
 * @access  Private (Teachers and Admins)
 */
router.post(
  '/:id/questions',
  [
    protect,
    authorize('教师', '管理员'),
    [
      check('text', '请输入问题内容').not().isEmpty(),
      check('type', '请选择问题类型').isIn(['单选题', '多选题', '判断题', '填空题', '简答题']),
      check('score', '请设置问题分值').isInt({ min: 1 }),
      check('difficulty', '请选择问题难度').isIn(['初级', '中级', '高级'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.validationError(res, errors.array());
    }
    
    try {
      const quiz = await Quiz.findById(req.params.id);
      
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      const questionData = {
        ...req.body,
        quiz: req.params.id
      };
      
      // Validate based on question type
      if (['单选题', '多选题'].includes(req.body.type) && (!req.body.options || req.body.options.length < 2)) {
        return ApiResponse.error(res, '选择题必须提供至少两个选项', 400);
      }
      
      if (['判断题', '填空题'].includes(req.body.type) && !req.body.correctAnswer) {
        return ApiResponse.error(res, '请提供正确答案', 400);
      }
      
      const newQuestion = new Question(questionData);
      await newQuestion.save();
      
      // Add question to quiz
      quiz.questions.push(newQuestion._id);
      await quiz.save();
      
      return ApiResponse.success(res, newQuestion, '问题添加成功', 201);
    } catch (err) {
      console.error('Add question error:', err.message);
      return ApiResponse.error(res, '问题添加失败', 500);
    }
  }
);

/**
 * @route   POST /api/quizzes/:id/attempt
 * @desc    Start a new quiz attempt
 * @access  Private
 */
router.post(
  '/:id/attempt',
  [protect],
  async (req, res) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      if (quiz.status !== '已发布') {
        return ApiResponse.error(res, '该测验尚未发布', 400);
      }
      
      // Check if user has reached max attempts
      const attemptCount = await UserQuizAttempt.countDocuments({
        user: req.user.id,
        quiz: quiz._id
      });
      
      if (!quiz.allowReattempt && attemptCount > 0) {
        return ApiResponse.error(res, '不允许重复尝试该测验', 400);
      }
      
      if (attemptCount >= quiz.maxAttempts) {
        return ApiResponse.error(res, `已达到最大尝试次数 (${quiz.maxAttempts})`, 400);
      }
      
      // Create new attempt
      const newAttempt = new UserQuizAttempt({
        user: req.user.id,
        quiz: quiz._id,
        startTime: Date.now(),
        attemptNumber: attemptCount + 1,
        status: '进行中',
        // Initialize empty answers array
        answers: quiz.questions.map(questionId => ({
          question: questionId,
          answer: null,
          isCorrect: false,
          score: 0
        }))
      });
      
      await newAttempt.save();
      
      return ApiResponse.success(res, newAttempt, '测验开始', 201);
    } catch (err) {
      console.error('Start quiz attempt error:', err.message);
      return ApiResponse.error(res, '开始测验失败', 500);
    }
  }
);

/**
 * @route   PUT /api/quizzes/attempts/:id
 * @desc    Submit answers for a quiz attempt
 * @access  Private
 */
router.put(
  '/attempts/:id',
  [protect],
  async (req, res) => {
    try {
      const attempt = await UserQuizAttempt.findById(req.params.id);
      
      if (!attempt) {
        return ApiResponse.notFound(res, '测验尝试');
      }
      
      // Verify ownership
      if (attempt.user.toString() !== req.user.id) {
        return ApiResponse.forbidden(res, '无权提交此测验');
      }
      
      // Check if attempt is already completed
      if (attempt.status !== '进行中') {
        return ApiResponse.error(res, '该测验尝试已完成', 400);
      }
      
      // Get the quiz to check time limit
      const quiz = await Quiz.findById(attempt.quiz);
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      // Check if time limit has been exceeded
      const now = new Date();
      const elapsedMinutes = (now - attempt.startTime) / (1000 * 60);
      
      if (elapsedMinutes > quiz.timeLimit) {
        attempt.status = '已超时';
        attempt.endTime = now;
        attempt.duration = Math.round((now - attempt.startTime) / 1000);
        await attempt.save();
        
        return ApiResponse.error(res, '测验时间已超时', 400);
      }
      
      // Update answers
      if (req.body.answers && Array.isArray(req.body.answers)) {
        for (const answer of req.body.answers) {
          const answerIndex = attempt.answers.findIndex(
            a => a.question.toString() === answer.questionId
          );
          
          if (answerIndex !== -1) {
            attempt.answers[answerIndex].answer = answer.answer;
          }
        }
      }
      
      // Calculate score and complete the attempt
      const result = await attempt.calculateScore();
      await attempt.save();
      
      return ApiResponse.success(res, {
        attempt,
        result,
        showAnswers: quiz.showAnswers
      }, '测验提交成功');
    } catch (err) {
      console.error('Submit quiz answers error:', err.message);
      return ApiResponse.error(res, '提交测验答案失败', 500);
    }
  }
);

/**
 * @route   GET /api/quizzes/attempts/:id
 * @desc    Get a specific quiz attempt
 * @access  Private
 */
router.get(
  '/attempts/:id',
  [protect],
  async (req, res) => {
    try {
      const attempt = await UserQuizAttempt.findById(req.params.id)
        .populate({
          path: 'quiz',
          select: 'title description timeLimit passingScore showAnswers'
        })
        .populate({
          path: 'answers.question',
          select: 'text type options explanation score'
        });
      
      if (!attempt) {
        return ApiResponse.notFound(res, '测验尝试');
      }
      
      // Check permission (user's own attempt or teacher/admin)
      if (
        attempt.user.toString() !== req.user.id &&
        !['教师', '管理员'].includes(req.user.role)
      ) {
        return ApiResponse.forbidden(res, '无权查看此测验尝试');
      }
      
      return ApiResponse.success(res, attempt, '获取测验尝试详情成功');
    } catch (err) {
      console.error('Get quiz attempt error:', err.message);
      return ApiResponse.error(res, '获取测验尝试详情失败', 500);
    }
  }
);

/**
 * @route   GET /api/quizzes/attempts/user/:userId
 * @desc    Get all quiz attempts for a user
 * @access  Private
 */
router.get(
  '/attempts/user/:userId',
  [protect],
  async (req, res) => {
    try {
      // Check permission (user's own attempts or teacher/admin)
      if (
        req.params.userId !== req.user.id &&
        !['教师', '管理员'].includes(req.user.role)
      ) {
        return ApiResponse.forbidden(res, '无权查看此用户的测验尝试');
      }
      
      const { quiz, status, limit = 10, page = 1 } = req.query;
      
      // Build query
      const queryOptions = {
        user: req.params.userId
      };
      
      if (quiz) {
        queryOptions.quiz = quiz;
      }
      
      if (status) {
        queryOptions.status = status;
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const attempts = await UserQuizAttempt.find(queryOptions)
        .populate({
          path: 'quiz',
          select: 'title description passingScore'
        })
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      const total = await UserQuizAttempt.countDocuments(queryOptions);
      
      return ApiResponse.paginate(res, attempts, page, limit, total, '获取测验尝试列表成功');
    } catch (err) {
      console.error('Get user quiz attempts error:', err.message);
      return ApiResponse.error(res, '获取用户测验尝试列表失败', 500);
    }
  }
);

/**
 * @route   GET /api/quizzes/statistics/:id
 * @desc    Get quiz statistics
 * @access  Private (Teachers and Admins)
 */
router.get(
  '/statistics/:id',
  [protect, authorize('教师', '管理员')],
  async (req, res) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      
      if (!quiz) {
        return ApiResponse.notFound(res, '测验');
      }
      
      // Get all attempts for this quiz
      const attempts = await UserQuizAttempt.find({ quiz: quiz._id })
        .populate('user', 'name email');
      
      // Calculate statistics
      const totalAttempts = attempts.length;
      const completedAttempts = attempts.filter(a => a.status === '已完成').length;
      const passedAttempts = attempts.filter(a => a.isPassed).length;
      
      const averageScore = attempts.length > 0
        ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length
        : 0;
      
      const averagePercentage = attempts.length > 0
        ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length
        : 0;
      
      const averageDuration = attempts.length > 0
        ? attempts.reduce((sum, attempt) => sum + (attempt.duration || 0), 0) / attempts.length
        : 0;
      
      // Get question performance data
      const questions = await Question.find({ quiz: quiz._id });
      const questionStats = [];
      
      for (const question of questions) {
        let correctCount = 0;
        let attemptCount = 0;
        
        for (const attempt of attempts) {
          const answer = attempt.answers.find(a => 
            a.question.toString() === question._id.toString()
          );
          
          if (answer && answer.answer !== null) {
            attemptCount++;
            if (answer.isCorrect) {
              correctCount++;
            }
          }
        }
        
        questionStats.push({
          questionId: question._id,
          text: question.text,
          type: question.type,
          difficulty: question.difficulty,
          correctCount,
          attemptCount,
          correctPercentage: attemptCount > 0 ? (correctCount / attemptCount) * 100 : 0
        });
      }
      
      const statistics = {
        quizId: quiz._id,
        title: quiz.title,
        totalAttempts,
        completedAttempts,
        passedAttempts,
        passRate: completedAttempts > 0 ? (passedAttempts / completedAttempts) * 100 : 0,
        averageScore,
        averagePercentage,
        averageDuration,
        questionStats,
        recentAttempts: attempts
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 10)
          .map(a => ({
            id: a._id,
            user: a.user,
            score: a.score,
            percentage: a.percentage,
            isPassed: a.isPassed,
            status: a.status,
            duration: a.duration,
            createdAt: a.createdAt
          }))
      };
      
      return ApiResponse.success(res, statistics, '获取测验统计信息成功');
    } catch (err) {
      console.error('Get quiz statistics error:', err.message);
      return ApiResponse.error(res, '获取测验统计信息失败', 500);
    }
  }
);

module.exports = router; 