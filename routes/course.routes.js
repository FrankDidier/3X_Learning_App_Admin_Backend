const express = require('express');
const { check, validationResult } = require('express-validator');
const Course = require('../models/Course');
const CourseSection = require('../models/CourseSection');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const UserQuizAttempt = require('../models/UserQuizAttempt');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses (with filtering)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      level, 
      difficulty, 
      search, 
      status,
      isRecommended
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (category) query.category = category;
    if (level) query.level = level;
    if (difficulty) query.difficulty = difficulty;
    if (status) query.status = status;
    if (isRecommended !== undefined) query.isRecommended = isRecommended === 'true';
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Count total documents
    const total = await Course.countDocuments(query);
    
    // Fetch courses with pagination
    const courses = await Course.find(query)
      .populate('creator', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    ApiResponse.paginate(res, courses, page, limit, total, '获取课程列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('creator', 'name')
      .populate('sections')
      .populate('quizzes');
    
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    ApiResponse.success(res, course, '获取课程详情成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Teacher/Admin)
router.post(
  '/',
  [
    protect,
    authorize('teacher', 'admin'),
    check('title', '请输入课程标题').not().isEmpty(),
    check('description', '请输入课程描述').not().isEmpty(),
    check('category', '请选择课程类别').isIn(['语文', '数学', '英语']),
    check('level', '请选择课程级别').isInt({ min: 1, max: 10 }),
    check('difficulty', '请选择课程难度').isIn(['初级', '中级', '高级']),
    check('price', '请输入课程价格').isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { 
        title, 
        description, 
        thumbnail, 
        category, 
        level, 
        difficulty, 
        price, 
        discountPrice, 
        tags 
      } = req.body;

      // Create new course
      const course = new Course({
        title,
        description,
        thumbnail,
        category,
        level,
        difficulty,
        price,
        discountPrice: discountPrice || 0,
        tags: tags || [],
        creator: req.user.id,
        status: req.user.role === 'admin' ? '已发布' : '待审核'
      });

      await course.save();
      
      // If user is a teacher, add course to their teaching courses
      if (req.user.role === 'teacher') {
        const User = require('../models/User');
        await User.findByIdAndUpdate(
          req.user.id,
          { $push: { teachingCourses: course._id } }
        );
      }

      ApiResponse.success(res, course, '创建课程成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Teacher/Admin)
router.put(
  '/:id',
  [
    protect,
    authorize('teacher', 'admin')
  ],
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      
      // Check ownership (except admins)
      if (req.user.role !== 'admin' && course.creator.toString() !== req.user.id) {
        return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
      }
      
      // Fields to update
      const { 
        title, 
        description, 
        thumbnail, 
        category, 
        level, 
        difficulty, 
        price, 
        discountPrice, 
        tags,
        status
      } = req.body;
      
      // Update fields if provided
      if (title) course.title = title;
      if (description) course.description = description;
      if (thumbnail) course.thumbnail = thumbnail;
      if (category) course.category = category;
      if (level) course.level = level;
      if (difficulty) course.difficulty = difficulty;
      if (price !== undefined) course.price = price;
      if (discountPrice !== undefined) course.discountPrice = discountPrice;
      if (tags) course.tags = tags;
      
      // Only admin can update status
      if (status && req.user.role === 'admin') {
        course.status = status;
      }
      
      await course.save();
      
      ApiResponse.success(res, course, '更新课程成功');
    } catch (err) {
      console.error(err);
      if (err.kind === 'ObjectId') {
        return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
      }
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Teacher/Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    // Check ownership (except admins)
    if (req.user.role !== 'admin' && course.creator.toString() !== req.user.id) {
      return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
    }
    
    // Delete course sections
    await CourseSection.deleteMany({ course: course._id });
    
    // Delete course quizzes and questions
    const quizzes = await Quiz.find({ course: course._id });
    for (const quiz of quizzes) {
      await Question.deleteMany({ quiz: quiz._id });
      await UserQuizAttempt.deleteMany({ quiz: quiz._id });
      await quiz.deleteOne();
    }
    
    // Remove course from teacher's teaching courses
    const User = require('../models/User');
    await User.updateMany(
      { teachingCourses: course._id },
      { $pull: { teachingCourses: course._id } }
    );
    
    // Remove course from students' enrolled courses
    await User.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id } }
    );
    
    // Delete the course
    await course.deleteOne();
    
    ApiResponse.success(res, null, '删除课程成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/courses/:id/sections
// @desc    Add a section to a course
// @access  Private (Teacher/Admin)
router.post(
  '/:id/sections',
  [
    protect,
    authorize('teacher', 'admin'),
    check('title', '请输入章节标题').not().isEmpty(),
    check('description', '请输入章节描述').not().isEmpty(),
    check('videoUrl', '请上传视频').not().isEmpty(),
    check('order', '请指定章节顺序').isNumeric()
  ],
  async (req, res) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    // }

    try {
      const course = await Course.findById(req.params.id);
      
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      
      // Check ownership (except admins)
      if (req.user.role !== 'admin' && course.creator.toString() !== req.user.id) {
        return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
      }
      
      const { 
        title, 
        description, 
        videoUrl, 
        videoThumbnail, 
        order, 
        duration, 
        resources,
        videoSegments,
        isPreview 
      } = req.body;
      
      // Create new section
      const section = new CourseSection({
        title,
        description,
        course: course._id,
        videoUrl,
        videoThumbnail,
        order,
        duration: duration || 0,
        resources: resources || [],
        videoSegments: videoSegments || [],
        isPreview: isPreview || false,
        status: course.status
      });
      
      await section.save();
      
      // Add section to course
      course.sections.push(section._id);
      await course.save();
      
      // Update course duration
      await course.calculateDuration();
      await course.save();
      
      ApiResponse.success(res, section, '添加章节成功');
    } catch (err) {
      console.error(err);
      if (err.kind === 'ObjectId') {
        return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
      }
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/courses/:courseId/sections/:sectionId
// @desc    Get a course section by ID
// @access  Public (but might require enrollment check for non-preview sections)
router.get('/:courseId/sections/:sectionId', async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    
    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    // Get section
    const section = await CourseSection.findById(sectionId);
    if (!section) {
      return ApiResponse.error(res, '章节不存在', 404, 'SECTION_NOT_FOUND');
    }
    
    // Verify section belongs to the course
    if (section.course.toString() !== courseId) {
      return ApiResponse.error(res, '章节不属于该课程', 400, 'INVALID_SECTION');
    }
    
    // Get user if authenticated
    let isEnrolled = false;
    if (req.headers.authorization) {
      const { protect } = require('../middleware/auth');
      const checkAuth = (req, res, next) => {
        try {
          protect(req, res, next);
        } catch (err) {
          // Continue even if not authenticated
          next();
        }
      };
      
      await new Promise(resolve => checkAuth(req, {}, resolve));
      
      if (req.user) {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        isEnrolled = user.enrolledCourses.includes(courseId);
      }
    }
    
    // Check if user can access this section
    if (!section.isPreview && !isEnrolled && course.price > 0) {
      return ApiResponse.error(res, '请先购买课程', 403, 'NOT_ENROLLED');
    }
    
    ApiResponse.success(res, section, '获取章节成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/courses/:id/sections
// @desc    Get all sections of a course
// @access  Public
router.get('/:id/sections', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    const sections = await CourseSection.find({ course: course._id })
      .sort({ order: 1 });
    
    ApiResponse.success(res, sections, '获取章节列表成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   PUT /api/courses/:courseId/sections/:sectionId
// @desc    Update a course section
// @access  Private (Teacher/Admin)
router.put(
  '/:courseId/sections/:sectionId',
  [
    protect,
    authorize('teacher', 'admin')
  ],
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.courseId);
      
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      
      // Check ownership (except admins)
      if (req.user.role !== 'admin' && course.creator.toString() !== req.user.id) {
        return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
      }
      
      const section = await CourseSection.findById(req.params.sectionId);
      
      if (!section) {
        return ApiResponse.error(res, '章节不存在', 404, 'SECTION_NOT_FOUND');
      }
      
      // Verify section belongs to the course
      if (section.course.toString() !== req.params.courseId) {
        return ApiResponse.error(res, '章节不属于该课程', 400, 'INVALID_SECTION');
      }
      
      // Fields to update
      const { 
        title, 
        description, 
        videoUrl, 
        videoThumbnail, 
        order, 
        duration, 
        resources,
        videoSegments,
        isPreview 
      } = req.body;
      
      // Update fields if provided
      if (title) section.title = title;
      if (description) section.description = description;
      if (videoUrl) section.videoUrl = videoUrl;
      if (videoThumbnail) section.videoThumbnail = videoThumbnail;
      if (order) section.order = order;
      if (duration) section.duration = duration;
      if (resources) section.resources = resources;
      if (videoSegments) section.videoSegments = videoSegments;
      if (isPreview !== undefined) section.isPreview = isPreview === 'on' || isPreview === true;
      
      await section.save();
      
      // Update course duration
      await course.calculateDuration();
      await course.save();
      
      ApiResponse.success(res, section, '更新章节成功');
    } catch (err) {
      console.error(err);
      if (err.kind === 'ObjectId') {
        return ApiResponse.error(res, '无效的ID', 400, 'INVALID_ID');
      }
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   DELETE /api/courses/:courseId/sections/:sectionId
// @desc    Delete a course section
// @access  Private (Teacher/Admin)
router.delete(
  '/:courseId/sections/:sectionId',
  [
    protect,
    authorize('teacher', 'admin')
  ],
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.courseId);
      
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      
      // Check ownership (except admins)
      if (req.user.role !== 'admin' && course.creator.toString() !== req.user.id) {
        return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
      }
      
      const section = await CourseSection.findById(req.params.sectionId);
      
      if (!section) {
        return ApiResponse.error(res, '章节不存在', 404, 'SECTION_NOT_FOUND');
      }
      
      // Verify section belongs to the course
      if (section.course.toString() !== req.params.courseId) {
        return ApiResponse.error(res, '章节不属于该课程', 400, 'INVALID_SECTION');
      }
      
      // Remove section from course
      course.sections = course.sections.filter(
        sectionId => sectionId.toString() !== req.params.sectionId
      );
      await course.save();
      
      // Delete the section
      await section.deleteOne();
      
      // Update course duration
      await course.calculateDuration();
      await course.save();
      
      ApiResponse.success(res, null, '删除章节成功');
    } catch (err) {
      console.error(err);
      if (err.kind === 'ObjectId') {
        return ApiResponse.error(res, '无效的ID', 400, 'INVALID_ID');
      }
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/courses/:id/enrollment
// @desc    Check if the current user is enrolled in a course
// @access  Private
router.get('/:id/enrollment', protect, async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    // Get user details
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    // Check if user is enrolled in this course
    const isEnrolled = user.enrolledCourses.some(
      id => id.toString() === courseId
    );
    
    // Return the enrollment status
    ApiResponse.success(res, { isEnrolled }, '获取课程注册状态成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的课程ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// Add routes for enrolling in courses, updating course sections, adding quizzes, etc.

module.exports = router; 