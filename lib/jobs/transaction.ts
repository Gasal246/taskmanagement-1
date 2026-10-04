import mongoose, { type ClientSession } from "mongoose";

export async function inTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(() => work(session));
    if (result === undefined) throw new Error("Transaction did not commit");
    return result;
  } finally {
    await session.endSession();
  }
}
