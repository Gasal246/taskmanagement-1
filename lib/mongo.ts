import mongoose from "mongoose";

const globalForMongoose = globalThis as typeof globalThis & {
  taskmanagerMongoose?: { connectionPromise: Promise<typeof mongoose> | null };
};
const connectionCache = globalForMongoose.taskmanagerMongoose ??= {
  connectionPromise: null,
};

type ConnectDBOptions = {
  throwOnError?: boolean;
};

const connectDB = async ({ throwOnError = true }: ConnectDBOptions = {}): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not configured");

    const isNewConnection = !connectionCache.connectionPromise;
    if (!connectionCache.connectionPromise) {
      connectionCache.connectionPromise = mongoose.connect(mongoUri, {
        autoIndex: process.env.MONGO_AUTO_INDEX ? process.env.MONGO_AUTO_INDEX === "true" : process.env.NODE_ENV !== "production",
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 30,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 10_000,
        waitQueueTimeoutMS: 2_000,
      }).finally(() => {
        // Retain only an in-flight promise. A resolved promise cannot reconnect.
        connectionCache.connectionPromise = null;
      });
    }

    await connectionCache.connectionPromise;
    if (isNewConnection && process.env.NODE_ENV !== "production") console.log("Connected to mongodb taskmanagement.");
  } catch (error) {
    console.error("Error while connecting to mongodb: ", error);
    if (throwOnError) throw error;
  }
};

export default connectDB;
