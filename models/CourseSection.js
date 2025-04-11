const mongoose = require('mongoose');

const CourseSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入章节标题'],
    trim: true,
    maxlength: [100, '章节标题不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '请输入章节描述']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '请指定所属课程']
  },
  order: {
    type: Number,
    required: [true, '请指定章节顺序']
  },
  duration: {
    type: Number,  // Duration in minutes
    default: 0
  },
  videoUrl: {
    type: String,
    required: [true, '请上传教学视频']
  },
  videoThumbnail: {
    type: String,
    default: 'default-video-thumbnail.jpg'
  },
  videoSegments: [{
    startTime: Number,  // Start time in seconds
    endTime: Number,    // End time in seconds
    title: String,      // Segment title
    description: String // Segment description
  }],
  resources: [{
    title: {
      type: String,
      required: [true, '请输入资源标题']
    },
    type: {
      type: String,
      enum: ['文档', '幻灯片', '练习', '链接', '其他'],
      required: [true, '请选择资源类型']
    },
    url: {
      type: String,
      required: [true, '请上传资源文件或输入链接']
    },
    description: String
  }],
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  isPreview: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['草稿', '待审核', '已发布', '已下架'],
    default: '草稿'
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
CourseSectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate completion based on user progress
CourseSectionSchema.methods.calculateCompletionForUser = function(userProgress) {
  if (!userProgress || !userProgress.watchedSegments || userProgress.watchedSegments.length === 0) {
    return 0;
  }
  
  // If no segments defined, use simple completion flag
  if (!this.videoSegments || this.videoSegments.length === 0) {
    return userProgress.completed ? 100 : 0;
  }
  
  // Calculate based on watched segments
  const totalSegments = this.videoSegments.length;
  const watchedSegments = userProgress.watchedSegments.length;
  return (watchedSegments / totalSegments) * 100;
};

module.exports = mongoose.model('CourseSection', CourseSectionSchema); 