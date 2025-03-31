const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add indexes for frequently queried fields
    await createIndexes();
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  // Get all models
  const models = mongoose.modelNames();
  
  // Create specific indexes for performance
  if (models.includes('User')) {
    const User = mongoose.model('User');
    await User.collection.createIndex({ email: 1 }, { unique: true });
  }
  
  if (models.includes('Course')) {
    const Course = mongoose.model('Course');
    await Course.collection.createIndex({ title: 'text', description: 'text' });
    await Course.collection.createIndex({ teacher: 1 });
  }
  
  if (models.includes('Payment')) {
    const Payment = mongoose.model('Payment');
    await Payment.collection.createIndex({ user: 1 });
    await Payment.collection.createIndex({ course: 1 });
    await Payment.collection.createIndex({ status: 1 });
    await Payment.collection.createIndex({ createdAt: -1 });
  }
};

module.exports = connectDB;