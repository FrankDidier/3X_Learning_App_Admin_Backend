const mongoose = require('mongoose');

const AiAssistanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请指定用户']
  },
  query: {
    type: String,
    required: [true, '请输入查询内容'],
    trim: true
  },
  queryType: {
    type: String,
    enum: ['problem_solving', 'explanation', 'resource_request', 'teaching_material', 'exercise_generation', 'other'],
    required: [true, '请选择查询类型']
  },
  subject: {
    type: String,
    enum: ['语文', '数学', '英语', '其他'],
    required: [true, '请选择学科']
  },
  grade: {
    type: String,
    required: [true, '请选择年级']
  },
  difficulty: {
    type: String,
    enum: ['初级', '中级', '高级'],
    required: [true, '请选择难度级别']
  },
  response: {
    type: String,
    required: [true, '请提供AI回复']
  },
  responseTime: {
    type: Number,  // Response time in milliseconds
    default: 0
  },
  helpful: {
    type: Boolean,
    default: null
  },
  userFeedback: {
    type: String
  },
  source: {
    type: String,
    enum: ['web', 'mobile'],
    required: [true, '请指定来源']
  },
  relatedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  generatedResources: [{
    title: String,
    type: String,
    content: String,
    url: String
  }],
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
AiAssistanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate teaching materials
AiAssistanceSchema.statics.generateTeachingMaterials = async function(subject, grade, topic, difficulty, count = 3) {
  try {
    // Placeholder for actual AI API call
    // In a real implementation, this would call an external AI service
    
    const materials = [];
    const difficultyLevels = ['初级', '中级', '高级'];
    
    // Ensure difficulty is valid
    if (!difficultyLevels.includes(difficulty)) {
      difficulty = '中级';
    }
    
    // Generate the specified number of materials
    for (let i = 0; i < count; i++) {
      materials.push({
        title: `${subject} ${topic} ${difficulty} 教学资料 ${i+1}`,
        type: 'teaching_material',
        content: `这是为${grade}年级${subject}${topic}生成的${difficulty}难度教学资料。`,
        url: ''
      });
    }
    
    return materials;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('生成教学资料失败');
  }
};

// Generate practice exercises
AiAssistanceSchema.statics.generateExercises = async function(subject, grade, topic, difficulty, count = 5) {
  try {
    // Placeholder for actual AI API call
    
    const exercises = [];
    const difficultyLevels = ['初级', '中级', '高级'];
    
    // Ensure difficulty is valid
    if (!difficultyLevels.includes(difficulty)) {
      difficulty = '中级';
    }
    
    // Generate the specified number of exercises
    for (let i = 0; i < count; i++) {
      exercises.push({
        title: `${subject} ${topic} ${difficulty} 练习题 ${i+1}`,
        type: 'exercise',
        content: `这是为${grade}年级${subject}${topic}生成的${difficulty}难度练习题。`,
        url: ''
      });
    }
    
    return exercises;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('生成练习题失败');
  }
};

module.exports = mongoose.model('AiAssistance', AiAssistanceSchema); 