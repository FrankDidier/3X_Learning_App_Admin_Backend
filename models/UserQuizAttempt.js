const mongoose = require('mongoose');

const UserQuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请指定用户']
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, '请指定测验']
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,  // Duration in seconds
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      default: 0
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    feedback: {
      type: String,
      default: ''
    }
  }],
  status: {
    type: String,
    enum: ['进行中', '已完成', '已超时', '已批改'],
    default: '进行中'
  },
  attemptNumber: {
    type: Number,
    required: [true, '请指定尝试次数']
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
UserQuizAttemptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate score based on answers
UserQuizAttemptSchema.methods.calculateScore = async function() {
  const QuizModel = mongoose.model('Quiz');
  const QuestionModel = mongoose.model('Question');
  
  const quiz = await QuizModel.findById(this.quiz);
  if (!quiz) throw new Error('找不到测验');
  
  let totalScore = 0;
  let earnedScore = 0;
  let correctAnswers = 0;
  
  for (const answerObj of this.answers) {
    const question = await QuestionModel.findById(answerObj.question);
    if (!question) continue;
    
    totalScore += question.score;
    
    // For essay questions that require manual grading
    if (question.type === '简答题' && answerObj.gradedBy) {
      earnedScore += answerObj.score;
      if (answerObj.isCorrect) correctAnswers++;
      continue;
    }
    
    // For automatically graded questions
    const isCorrect = question.checkAnswer(answerObj.answer);
    answerObj.isCorrect = isCorrect;
    
    if (isCorrect) {
      answerObj.score = question.score;
      earnedScore += question.score;
      correctAnswers++;
    } else {
      answerObj.score = 0;
    }
  }
  
  this.score = earnedScore;
  this.percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
  this.isPassed = this.percentage >= quiz.passingScore;
  
  if (!this.endTime) {
    this.endTime = new Date();
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
  
  this.status = '已完成';
  
  return {
    score: this.score,
    percentage: this.percentage,
    isPassed: this.isPassed,
    correctAnswers,
    totalQuestions: this.answers.length
  };
};

module.exports = mongoose.model('UserQuizAttempt', UserQuizAttemptSchema); 