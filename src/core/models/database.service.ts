import mongoose, { Connection } from 'mongoose';

export class DatabaseService {
  private static instance: DatabaseService;
  private connection: Connection | null = null;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<Connection> {
    if (!this.connection || this.connection.readyState !== 1) {
      const mongoUrl = process.env['MONGODB-testing'];

      if (!mongoUrl) {
        throw new Error('MONGODB-testing connection string not found in environment variables');
      }

      try {
        this.connection = mongoose.createConnection(mongoUrl, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 120000,
          bufferCommands: false,
          connectTimeoutMS: 30000,
        });

        await this.connection.asPromise();
        console.log('✅ Connected to MongoDB');
      } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
      }
    }

    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  getConnection(): Connection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection?.readyState === 1;
  }
}