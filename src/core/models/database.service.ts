import mongoose from 'mongoose';
import User from './user.model';

export class DatabaseService {
  private static instance: DatabaseService;
  private connectionEstablished: boolean = false;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.connectionEstablished && mongoose.connection.readyState === 1) {
      return;
    }

    const mongoUrl = process.env['MONGODB-testing']?.trim();

    console.log('🔍 Connecting to MongoDB:', mongoUrl);

    if (!mongoUrl) {
      throw new Error('MONGODB-testing connection string not found in environment variables');
    }

    try {
      await mongoose.connect(mongoUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 120000,
        bufferCommands: false,
        connectTimeoutMS: 30000,
      });

      this.connectionEstablished = true;

      // Ensure indexes are created for all models
      try {
        await User.createIndexes();
        console.log('✅ Connected to MongoDB and indexes created');
      } catch (indexError) {
        console.warn('⚠️  Index creation warning:', indexError);
        console.log('✅ Connected to MongoDB (index creation skipped)');
      }
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      this.connectionEstablished = false;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  getConnection() {
    return mongoose.connection || null;
  }

  isConnected(): boolean {
    return mongoose.connection?.readyState === 1;
  }
}