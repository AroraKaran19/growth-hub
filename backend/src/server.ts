import app from "./app";
import { connectDB, disconnectDB } from "./config/database";
import dotenv from "dotenv";
import { initializeS3 } from "./config/aws";

dotenv.config();

if (!process.env.PORT) {
  throw new Error("PORT is not defined in environment variables");
}

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    await initializeS3().catch((error: unknown) => {
      console.warn(
        "⚠️  S3 unavailable, image uploads will fail:",
        error instanceof Error ? error.message : error,
      );
    });

    const server = app.listen(PORT, () => {
      console.log(`🚀 Growth Hub Backend Server is running on port ${PORT}`);
      console.log(`🌐 Health check available at: http://localhost:${PORT}/`);
    });

    // Gracefully shutdown the server
    process.on("SIGTERM", () => {
      console.log("🔄 Shutting down server...");
      server.close(async () => {
        console.log("🔒 Server closed");
        disconnectDB();
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
