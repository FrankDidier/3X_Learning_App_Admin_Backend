const express = require('express');
const { check, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/teaching/courses
// @desc    Get all courses created by the current teacher
// @access  Private (Teacher)
router.get('/courses', protect, authorize('teacher'), async (req, res) => {
    console.log(req.user,'req.user');
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      search 
    } = req.query;
    
    // Build query
    const query = { creator: req.user.id };
    
    // Add filters if provided
    if (status) query.status = status;
    
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
    
    ApiResponse.paginate(res, courses, page, limit, total, '获取教师课程列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/teaching/courses/:courseId/students
// @desc    Get all students enrolled in a specific course
// @access  Private (Teacher)
router.get('/courses/:courseId/students', protect, authorize('teacher'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
    }
    
    // Check ownership
    if (course.creator.toString() !== req.user.id) {
      return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
    }
    
    // Get students enrolled in this course
    const students = await User.find({ enrolledCourses: course._id })
      .select('name email phone avatar studentId lastLogin')
      .sort({ lastLogin: -1 });
    
    ApiResponse.success(res, students, '获取课程学生列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/teaching/courses/:courseId/lessons/:lessonId/students/:studentId/grade
// @desc    Grade a student's assignment
// @access  Private (Teacher)
router.post('/courses/:courseId/lessons/:lessonId/students/:studentId/grade', 
  protect, 
  authorize('teacher'),
  [
    check('grade', '请输入分数').isNumeric(),
    check('feedback', '请输入评语').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { courseId, lessonId, studentId } = req.params;
      const { grade, feedback } = req.body;
      
      // Verify course exists and belongs to teacher
      const course = await Course.findById(courseId);
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      if (course.creator.toString() !== req.user.id) {
        return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
      }
      
      // Verify student is enrolled in the course
      const student = await User.findById(studentId);
      if (!student || !student.enrolledCourses.includes(courseId)) {
        return ApiResponse.error(res, '学生未报名该课程', 400, 'STUDENT_NOT_ENROLLED');
      }
      
      // TODO: Save grade and feedback to database
      // This is a placeholder for the actual implementation
      const gradeResult = {
        courseId,
        lessonId,
        studentId,
        grade,
        feedback,
        gradedBy: req.user.id,
        gradedAt: new Date()
      };
      
      ApiResponse.success(res, gradeResult, '评分成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/teaching/stats
// @desc    Get teacher's statistics
// @access  Private (Teacher)
router.get('/stats', protect, authorize('teacher'), async (req, res) => {
  try {
    // Get total courses
    const totalCourses = await Course.countDocuments({ creator: req.user.id });
    
    // Get total students across all courses
    const courses = await Course.find({ creator: req.user.id });
    const courseIds = courses.map(course => course._id);
    const totalStudents = await User.countDocuments({ 
      enrolledCourses: { $in: courseIds } 
    });
    
    // Get total revenue (placeholder - implement actual revenue calculation)
    const totalRevenue = 15890; // This should be calculated from actual payment records
    
    // Get revenue data for the last 6 months
    const revenueData = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      values: [1200, 1900, 2400, 3200, 3800, 3290]
    };
    
    // Get enrollment data by category
    const enrollmentData = {
      labels: ["数学", "物理", "化学", "英语", "编程"],
      values: [42, 28, 15, 22, 20]
    };
    
    ApiResponse.success(res, {
      totalCourses,
      totalStudents,
      totalRevenue,
      revenueData,
      enrollmentData
    }, '获取教师统计数据成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/teaching/revenue
// @desc    Get teacher's revenue statistics
// @access  Private (Teacher)
router.get('/revenue', protect, authorize('teacher'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get total revenue (placeholder - implement actual revenue calculation)
    const totalRevenue = 15890;
    
    // Get revenue chart data
    const chart = {
      labels: period === 'month' 
        ? ["1月", "2月", "3月", "4月", "5月", "6月"] 
        : ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      values: period === 'month'
        ? [1200, 1900, 2400, 3200, 3800, 3290]
        : [420, 380, 510, 390, 450, 600, 550]
    };
    
    // Get top courses by revenue
    const courses = [
      {
        id: "course-1",
        title: "高中数学基础",
        revenue: 8750,
        students: 120,
        salesPercentage: 55
      },
      {
        id: "course-2",
        title: "高中物理精讲",
        revenue: 5140,
        students: 98,
        salesPercentage: 32
      },
      {
        id: "course-3",
        title: "初级编程入门",
        revenue: 2000,
        students: 45,
        salesPercentage: 13
      }
    ];
    
    ApiResponse.success(res, {
      totalRevenue,
      period,
      chart,
      courses
    }, '获取收入统计成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/teaching/activities
// @desc    Get teacher's recent activities
// @access  Private (Teacher)
router.get('/activities', protect, authorize('teacher'), async (req, res) => {
  try {
    // TODO: Implement actual activity tracking
    const activities = [
      {
        id: "activity-1",
        type: "enrollment",
        message: "李四加入了您的「高中数学基础」课程",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "activity-2",
        type: "assignment",
        message: "王五提交了「第三章习题」的作业",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "activity-3",
        type: "review",
        message: "您的课程「高中物理精讲」收到了一条5星评价",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
    
    ApiResponse.success(res, activities, '获取最近活动成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

module.exports = router; 