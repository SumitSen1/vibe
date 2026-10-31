import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined in backend/.env');
    }

    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`\n✅ MONGODB CONNECTED || Host: ${connectionInstance.connection.host} || DB: ${connectionInstance.connection.name}`);
  } catch (error) {
    console.error('❌ MONGO_DB CONNECTION FAILED:\n', error.message || error);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected successfully.');
});

export default connectDB;
