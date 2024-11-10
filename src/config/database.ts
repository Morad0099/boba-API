import mongoose from "mongoose";

const isDevelopment = process.env.NODE_ENV === 'development';

interface DBConfig {
  MONGODB_URI: string;
  options: mongoose.ConnectOptions;
}

const getDBConfig = (): DBConfig => {
  if (isDevelopment) {
    return {
      MONGODB_URI: "mongodb://localhost:27017/boba-app",
      options: {
        // No auth for development
      }
    };
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/boba-app",
    options: {
      authSource: "admin",
      authMechanism: "SCRAM-SHA-1",
      auth: {
        username: "lazypay",
        password: "M!Lazysis@t0m1c112@",
      },
    }
  };
};

export async function connectDB() {
  try {
    const config = getDBConfig();
    await mongoose.connect(config.MONGODB_URI, config.options);
    console.log(`🍃 Connected to MongoDB (${isDevelopment ? 'Development' : 'Production'})`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});