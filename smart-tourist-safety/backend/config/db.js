import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`\n MONGODB IS CONNECTED || DB_Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log('MONGO_DB CONNECTION FAILED\n', error);
    process.exit(1);
  }
};

export default connectDB;