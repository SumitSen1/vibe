import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\n MONGODB IS CONNECTED || DB_Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log('MONGO_DB CONNECTION FAILED\n', error);
    process.exit(1);
  }
};

export default connectDB;