const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入课程标题'],
    trim: true,
    maxlength: [100, '课程标题不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '请输入课程描述']
  },
  thumbnail: {
    type: String,
    default: 'default-course.jpg'
  },
  level: {
    type: Number,
    min: 1,
    max: 10,
    required: [true, '请选择课程级别']
  },
  category: {
    type: String,
    enum: ['语文', '数学', '英语','物理','化学'],
    required: [true, '请选择课程类别']
  },
  difficulty: {
    type: String,
    enum: ['初级', '中级', '高级'],
    required: [true, '请选择课程难度']
  },
  price: {
    type: Number,
    required: [true, '请输入课程价格']
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请指定课程创建者']
  },
  sections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSection'
  }],
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['草稿', '待审核', '已发布', '已下架'],
    default: '草稿'
  },
  tags: [String],
  isRecommended: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,  // Total duration in minutes
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
CourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate course total duration from sections
CourseSchema.methods.calculateDuration = async function() {
  const CourseSectionModel = mongoose.model('CourseSection');
  let totalDuration = 0;
  
  for (const sectionId of this.sections) {
    const section = await CourseSectionModel.findById(sectionId);
    if (section) {
      totalDuration += section.duration || 0;
    }
  }
  
  this.duration = totalDuration;
  return totalDuration;
};

// Virtual for course completion percentage
CourseSchema.virtual('completionRate').get(function() {
  if (this.enrollmentCount === 0) return 0;
  return (this.completionCount || 0) / this.enrollmentCount * 100;
});

module.exports = mongoose.model('Course', CourseSchema); 