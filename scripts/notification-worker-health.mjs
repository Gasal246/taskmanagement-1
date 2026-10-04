import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
nextEnv.loadEnvConfig(process.cwd());
const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
try {
  await client.connect(); const db = client.db();
  const heartbeat = await db.collection('worker_heartbeats').findOne({ _id: 'notification-worker' });
  const delayed = await db.collection('background_jobs').findOne({ status: 'pending', available_at: { $lt: new Date(Date.now() - 300000) } });
  const healthy = heartbeat && Date.now() - new Date(heartbeat.last_seen_at).getTime() < 180000 && !delayed;
  console.log(healthy ? 'Notification worker healthy' : 'Notification worker missing heartbeat or queue delayed'); process.exitCode = healthy ? 0 : 1;
} catch { console.error('Notification worker health check failed'); process.exitCode = 1; }
finally { await client.close(); }
