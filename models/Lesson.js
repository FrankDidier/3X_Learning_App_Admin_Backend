const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入课时标题'],
    trim: true,
    maxlength: [100, '课时标题不能超过100个字符']
  },
  type: {
    type: String,
    enum: ['video', 'text', 'quiz', 'assignment'],
    required: [true, '请选择课时类型']
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSection',
    required: [true, '请指定所属章节']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '请指定所属课程']
  },
  order: {
    type: Number,
    required: [true, '请指定课时顺序']
  },
  duration: {
    type: Number,  // Duration in minutes
    default: 0
  },
  content: {
    // 根据课时类型存储不同内容
    videoUrl: String,         // 视频类型
    textContent: String,      // 文本类型
    quizId: mongoose.Schema.Types.ObjectId,  // 测验类型
    assignmentDetails: {      // 作业类型
      description: String,
      dueDate: Date,
      totalPoints: Number,
      files: [{
        name: String,
        url: String
      }]
    }
  },
  resources: [{
    title: {
      type: String,
      required: [true, '请输入资源标题']
    },
    type: {
      type: String,
      enum: ['document', 'presentation', 'exercise', 'link', 'other'],
      required: [true, '请选择资源类型']
    },
    url: {
      type: String,
      required: [true, '请上传资源文件或输入链接']
    },
    description: String
  }],
  isPreview: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'published', 'archived'],
    default: 'draft'
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
LessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lesson', LessonSchema); 