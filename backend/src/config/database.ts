import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(`MONGODB_URI is not defined in environment variables.`);
    }

    console.log("🔄 Connecting to MongoDB...");
    const maxPoolSize = Math.max(1, Number(process.env.DB_MAX_POOL_SIZE) || 5);
    const minPoolSize = Math.min(
      maxPoolSize,
      Math.max(0, Number(process.env.DB_MIN_POOL_SIZE ?? 1)),
    );
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize,
      minPoolSize,
      maxIdleTimeMS: 30000,      // Reclaim idle connections after 30s
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 45000,
      socketTimeoutMS: 120000,   // 2 min is enough for large ops; 10 min was masking drops
      connectTimeoutMS: 10000,
      bufferCommands: false,
    });
    console.log(
      `⚙️  Mongo pool: max=${maxPoolSize} min=${minPoolSize} per process`,
    );

    console.log(`🔗 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  Mongoose disconnected from MongoDB");
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
  }
};

export { connectDB, disconnectDB };
