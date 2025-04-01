const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, '请指定所属测验']
  },
  text: {
    type: String,
    required: [true, '请输入问题内容'],
    trim: true
  },
  type: {
    type: String,
    enum: ['单选题', '多选题', '判断题', '填空题', '简答题'],
    required: [true, '请选择问题类型']
  },
  options: [{
    text: {
      type: String,
      required: function() {
        return ['单选题', '多选题'].includes(this.type);
      }
    },
    isCorrect: {
      type: Boolean,
      required: function() {
        return ['单选题', '多选题'].includes(this.type);
      }
    }
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return ['判断题', '填空题'].includes(this.type);
    }
  },
  explanation: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    required: [true, '请设置问题分值'],
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['初级', '中级', '高级'],
    required: [true, '请选择问题难度']
  },
  tags: [String],
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
QuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if an answer is correct
QuestionSchema.methods.checkAnswer = function(userAnswer) {
  // For single choice questions
  if (this.type === '单选题') {
    const correctOption = this.options.findIndex(option => option.isCorrect);
    return userAnswer === correctOption;
  }
  
  // For multiple choice questions
  if (this.type === '多选题') {
    if (!Array.isArray(userAnswer)) return false;
    
    const correctOptions = this.options
      .map((option, index) => option.isCorrect ? index : -1)
      .filter(index => index !== -1);
    
    // Check if arrays have same length and same elements
    if (userAnswer.length !== correctOptions.length) return false;
    
    return userAnswer.every(answer => correctOptions.includes(answer)) &&
      correctOptions.every(correct => userAnswer.includes(correct));
  }
  
  // For true/false questions
  if (this.type === '判断题') {
    return userAnswer === this.correctAnswer;
  }
  
  // For fill-in-the-blank questions
  if (this.type === '填空题') {
    return userAnswer.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase();
  }
  
  // For essay questions, require manual grading
  if (this.type === '简答题') {
    return null; // Indicates manual grading needed
  }
  
  return false;
};

module.exports = mongoose.model('Question', QuestionSchema); 