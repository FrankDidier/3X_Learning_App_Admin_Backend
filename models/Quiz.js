const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入测验标题'],
    trim: true,
    maxlength: [100, '测验标题不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '请输入测验描述']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '请指定所属课程']
  },
  timeLimit: {
    type: Number,  // Time limit in minutes
    required: [true, '请设置时间限制']
  },
  passingScore: {
    type: Number,  // Percentage required to pass
    required: [true, '请设置通过分数'],
    min: 0,
    max: 100
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  difficulty: {
    type: String,
    enum: ['初级', '中级', '高级'],
    required: [true, '请选择测验难度']
  },
  status: {
    type: String,
    enum: ['草稿', '待审核', '已发布', '已下架'],
    default: '草稿'
  },
  allowReattempt: {
    type: Boolean,
    default: true
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  showAnswers: {
    type: Boolean,
    default: false
  },
  randomizeQuestions: {
    type: Boolean,
    default: false
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
QuizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate total score possible
QuizSchema.methods.calculateTotalScore = async function() {
  const QuestionModel = mongoose.model('Question');
  let totalScore = 0;
  
  for (const questionId of this.questions) {
    const question = await QuestionModel.findById(questionId);
    if (question) {
      totalScore += question.score || 1;  // Default to 1 if no score specified
    }
  }
  
  return totalScore;
};

// Calculate average score from all attempts
QuizSchema.methods.calculateAverageScore = async function() {
  const UserQuizAttemptModel = mongoose.model('UserQuizAttempt');
  
  const attempts = await UserQuizAttemptModel.find({ quiz: this._id });
  if (!attempts || attempts.length === 0) return 0;
  
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  return totalScore / attempts.length;
};

module.exports = mongoose.model('Quiz', QuizSchema); 