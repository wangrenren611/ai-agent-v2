import mongoose from 'mongoose';


export const connectDB = async () => {

   if(!process.env.MONGODB_URI){
      throw new Error('MONGODB_URI is not set');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    return conn;
     
    
  } catch (error:any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }

  
};

