const express = require('express');
const { check, validationResult } = require('express-validator');
const AiAssistance = require('../models/AiAssistance');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/ai/query
// @desc    Submit a new AI query
// @access  Private
router.post(
  '/query',
  [
    protect,
    check('query', '请输入您的问题').not().isEmpty(),
    check('queryType', '请选择问题类型').isIn(['homework', 'concept', 'example', 'practice', 'other']),
    check('subject', '请选择科目').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { 
        query, 
        queryType, 
        subject, 
        grade, 
        relatedCourse,
        difficulty
      } = req.body;

      // Create a new AI assistance record
      const aiAssistance = new AiAssistance({
        user: req.user.id,
        query,
        queryType,
        subject,
        grade: grade || null,
        relatedCourse: relatedCourse || null,
        difficulty: difficulty || 'medium'
      });

      // TODO: Implement actual AI API call here
      // This is a placeholder for the actual AI processing
      const startTime = Date.now();
      
      let response = '';
      let generatedResources = [];
      
      // Generate different responses based on query type
      switch (queryType) {
        case 'homework':
          response = `这是您"${subject}"科目的问题解答: ${query}\n\n解答步骤:\n1. 理解问题\n2. 分析关键点\n3. 应用公式解答\n4. 得出结论`;
          break;
        case 'concept':
          response = `"${subject}"科目中关于"${query}"的概念讲解:\n\n定义: ...\n核心要点: ...\n应用场景: ...\n相关概念: ...`;
          break;
        case 'example':
          response = `以下是"${subject}"科目中关于"${query}"的例题和解析:\n\n例题1: ...\n解析: ...\n\n例题2: ...\n解析: ...`;
          generatedResources = [
            { type: 'pdf', title: '例题详解', url: '/resources/example-1.pdf' }
          ];
          break;
        case 'practice':
          response = `以下是基于"${query}"生成的${difficulty}难度练习题:\n\n1. ...\n2. ...\n3. ...\n\n答案与解析: ...`;
          generatedResources = [
            { type: 'quiz', title: '练习题集', url: '/resources/practice-1.json' }
          ];
          break;
        default:
          response = `关于"${query}"的回答:\n\n${query}是一个重要的问题，以下是详细解析...`;
      }
      
      const responseTime = Date.now() - startTime;
      
      // Update the AI assistance record with the response
      aiAssistance.response = response;
      aiAssistance.responseTime = responseTime;
      aiAssistance.generatedResources = generatedResources;
      
      await aiAssistance.save();
      
      ApiResponse.success(res, {
        id: aiAssistance._id,
        response,
        responseTime,
        generatedResources
      }, 'AI查询成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/ai/history
// @desc    Get AI query history for current user
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Count total queries for this user
    const total = await AiAssistance.countDocuments({ user: req.user.id });
    
    // Fetch queries with pagination
    const queries = await AiAssistance.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('query queryType subject grade response helpful createdAt');
    
    ApiResponse.paginate(res, queries, page, limit, total, '获取AI查询历史成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/ai/query/:id
// @desc    Get specific AI query by ID
// @access  Private
router.get('/query/:id', protect, async (req, res) => {
  try {
    const query = await AiAssistance.findById(req.params.id);
    
    if (!query) {
      return ApiResponse.error(res, '查询记录不存在', 404, 'QUERY_NOT_FOUND');
    }
    
    // Check if the user is authorized to view this query
    if (query.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '无权访问此查询', 403, 'UNAUTHORIZED');
    }
    
    ApiResponse.success(res, query, '获取AI查询详情成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的查询ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/ai/feedback/:id
// @desc    Add feedback to an AI query
// @access  Private
router.post('/feedback/:id', [
  protect,
  check('helpful', '请选择是否有帮助').isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
  }
  
  try {
    const query = await AiAssistance.findById(req.params.id);
    
    if (!query) {
      return ApiResponse.error(res, '查询记录不存在', 404, 'QUERY_NOT_FOUND');
    }
    
    // Check if the user is authorized to add feedback
    if (query.user.toString() !== req.user.id) {
      return ApiResponse.error(res, '无权修改此查询', 403, 'UNAUTHORIZED');
    }
    
    const { helpful, userFeedback } = req.body;
    
    query.helpful = helpful;
    if (userFeedback) {
      query.userFeedback = userFeedback;
    }
    
    await query.save();
    
    ApiResponse.success(res, query, '反馈提交成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的查询ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/ai/generate-materials
// @desc    Generate teaching materials for a topic
// @access  Private (Teacher)
router.post(
  '/generate-materials',
  [
    protect,
    authorize('teacher', 'admin'),
    check('subject', '请选择科目').not().isEmpty(),
    check('topic', '请输入主题').not().isEmpty(),
    check('grade', '请选择年级').not().isEmpty(),
    check('materialType', '请选择资料类型').isIn(['lesson', 'quiz', 'handout', 'slides']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { 
        subject, 
        topic, 
        grade, 
        materialType,
        difficulty,
        additionalInstructions
      } = req.body;

      // Create a new AI assistance record
      const aiAssistance = new AiAssistance({
        user: req.user.id,
        query: `为${grade}年级生成${subject}科目关于${topic}的${materialType}资料`,
        queryType: 'teaching',
        subject,
        grade,
        difficulty: difficulty || 'medium',
        source: 'teacher',
      });

      // Use the model's method to generate teaching materials
      const result = await aiAssistance.generateTeachingMaterials({
        subject,
        grade,
        topic,
        materialType,
        difficulty,
        additionalInstructions
      });
      
      // Save the response
      aiAssistance.response = result.content;
      aiAssistance.generatedResources = result.resources;
      
      await aiAssistance.save();
      
      ApiResponse.success(res, {
        id: aiAssistance._id,
        response: result.content,
        resources: result.resources
      }, '教学资料生成成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/ai/generate-exercises
// @desc    Generate practice exercises for a topic
// @access  Private (Teacher)
router.post(
  '/generate-exercises',
  [
    protect,
    authorize('teacher', 'admin'),
    check('subject', '请选择科目').not().isEmpty(),
    check('topic', '请输入主题').not().isEmpty(),
    check('grade', '请选择年级').not().isEmpty(),
    check('count', '请输入题目数量').isInt({ min: 1, max: 20 }),
    check('difficulty', '请选择难度').isIn(['easy', 'medium', 'hard']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { 
        subject, 
        topic, 
        grade, 
        count,
        difficulty,
        exerciseType,
        withSolutions
      } = req.body;

      // Create a new AI assistance record
      const aiAssistance = new AiAssistance({
        user: req.user.id,
        query: `为${grade}年级生成${count}道${difficulty}难度的${subject}科目关于${topic}的练习题`,
        queryType: 'practice',
        subject,
        grade,
        difficulty,
        source: 'teacher',
      });

      // Use the model's method to generate exercises
      const result = await aiAssistance.generatePracticeExercises({
        subject,
        grade,
        topic,
        count: count || 5,
        difficulty,
        exerciseType: exerciseType || 'mixed',
        withSolutions: withSolutions !== false
      });
      
      // Save the response
      aiAssistance.response = result.content;
      aiAssistance.generatedResources = result.resources;
      
      await aiAssistance.save();
      
      ApiResponse.success(res, {
        id: aiAssistance._id,
        response: result.content,
        exercises: result.exercises,
        resources: result.resources
      }, '练习题生成成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/ai/statistics
// @desc    Get AI usage statistics
// @access  Private (Admin)
router.get('/statistics', protect, authorize('admin'), async (req, res) => {
  try {
    // Count total queries
    const totalQueries = await AiAssistance.countDocuments();
    
    // Group by query type
    const queryTypeStats = await AiAssistance.aggregate([
      { $group: {
        _id: '$queryType',
        count: { $sum: 1 }
      }}
    ]);
    
    // Group by subject
    const subjectStats = await AiAssistance.aggregate([
      { $group: {
        _id: '$subject',
        count: { $sum: 1 }
      }}
    ]);
    
    // Calculate average response time
    const avgResponseTime = await AiAssistance.aggregate([
      { $group: {
        _id: null,
        avg: { $avg: '$responseTime' }
      }}
    ]);
    
    // Get helpful feedback percentage
    const helpfulCount = await AiAssistance.countDocuments({ helpful: true });
    const feedbackCount = await AiAssistance.countDocuments({ helpful: { $ne: null } });
    const helpfulPercentage = feedbackCount > 0 ? (helpfulCount / feedbackCount) * 100 : 0;
    
    ApiResponse.success(res, {
      totalQueries,
      queryTypeBreakdown: queryTypeStats.reduce((obj, item) => {
        obj[item._id] = item.count;
        return obj;
      }, {}),
      subjectBreakdown: subjectStats.reduce((obj, item) => {
        obj[item._id] = item.count;
        return obj;
      }, {}),
      averageResponseTime: avgResponseTime.length > 0 ? avgResponseTime[0].avg : 0,
      helpfulPercentage,
      feedbackCount
    }, '获取AI统计数据成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

module.exports = router; 