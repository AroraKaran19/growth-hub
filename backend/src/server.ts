import app from "./app";
import { connectDB, disconnectDB } from "./config/database";
import dotenv from "dotenv";
import { initializeS3 } from "./config/aws";
import { migrateLegacyPermissions } from "./services/permissions";
import { migrateMembershipPrices } from "./services/membershipPlan.service";
import { dropLegacyCheckInIndex } from "./services/checkIn.service";

dotenv.config();

if (!process.env.PORT) {
  throw new Error("PORT is not defined in environment variables");
}

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    const migrated = await migrateLegacyPermissions();
    if (migrated) console.log(`Moved ${migrated} admin(s) from the Venues permission to the Workspaces group.`);
    const plans = await migrateMembershipPrices();
    if (plans) console.log(`Turned venue membership prices into ${plans} membership plan(s).`);
    await dropLegacyCheckInIndex();
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
