import mongoose from 'mongoose';

export const connectDB = async () => {
   if(!process.env.MONGODB_URI){
      throw new Error('MONGODB_URI is not set');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30秒超时
      socketTimeoutMS: 45000,           // 45秒socket超时
      connectTimeoutMS: 30000,          // 30秒连接超时
    });

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    return conn;


  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error connecting to MongoDB: ${message}`);
      process.exit(1);
  }


};
