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

const connectDB = async ({ throwOnError = false }: ConnectDBOptions = {}): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not configured");

    const isNewConnection = !connectionCache.connectionPromise;
    if (!connectionCache.connectionPromise) {
      connectionCache.connectionPromise = mongoose.connect(mongoUri).finally(() => {
        if (mongoose.connection.readyState !== 1) {
          connectionCache.connectionPromise = null;
        }
      });
    }

    await connectionCache.connectionPromise;
    if (isNewConnection) console.log("Connected to mongodb taskmanagement.");
  } catch (error) {
    console.error("Error while connecting to mongodb: ", error);
    if (throwOnError) throw error;
  }
};

export default connectDB;
