const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connection successful!');
    console.log('Connected to database:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();