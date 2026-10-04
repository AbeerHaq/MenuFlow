const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    // Check if valid MongoDB Atlas or custom URI is provided (not unreplaced template)
    if (mongoUri && !mongoUri.includes('<db_username>') && !mongoUri.includes('<db_password>')) {
      try {
        console.log('Connecting to MongoDB Atlas / remote database...');
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected successfully to: ${conn.connection.host}`);
        return conn;
      } catch (atlasErr) {
        console.warn(`MongoDB Atlas connection failed (${atlasErr.message}). Falling back to local/in-memory database...`);
      }
    } else if (mongoUri && (mongoUri.includes('<db_username>') || mongoUri.includes('<db_password>'))) {
      console.log('Notice: MongoDB Atlas URI template detected. Replace <db_username> and <db_password> with your Atlas user credentials in .env when deploying online.');
    }

    // Attempt local default MongoDB connection first
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/menuflow', {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`MongoDB Connected locally: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      console.log('Local MongoDB not reachable, starting in-memory MongoDB server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const uri = mongodInstance.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`In-memory MongoDB Connected: ${uri}`);
      return conn;
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;