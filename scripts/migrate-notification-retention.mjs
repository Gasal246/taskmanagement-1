import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
nextEnv.loadEnvConfig(process.cwd());
const client = new MongoClient(process.env.MONGO_URI);
const apply = process.argv.includes('--apply');
try {
  await client.connect(); const collection = client.db().collection('notifications');
  const indexes = await collection.indexes();
  const legacy = indexes.filter(index => index.expireAfterSeconds !== undefined && index.key.createdAt);
  console.log(JSON.stringify({ apply, legacyTTLIndexes: legacy.map(index => index.name), unreadRetained: true, readRetentionDays: 30 }));
  if (apply) {
    // Stop age-based deletion first; unread rows must never have an expiry.
    for (const index of legacy) await collection.dropIndex(index.name);
    await collection.updateMany({ read_at: null, archived_at: null }, { $unset: { expires_at: '' } });
    // Preserve existing read history for 30 days from migration, without deleting it now.
    await collection.updateMany({ read_at: { $ne: null }, expires_at: null }, { $set: { expires_at: new Date(Date.now() + 30 * 86400000) } });
    await collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ recipient_id: 1, archived_at: 1, read_at: 1, createdAt: -1, _id: -1 });
    await collection.createIndex({ recipient_id: 1, archived_at: 1, createdAt: -1, _id: -1 });
    await collection.createIndex({ action_required: 1, read_at: 1, next_reminder_at: 1 });
    console.log('Unread-preserving notification retention is active. No notifications were deleted by this migration.');
  }
} finally { await client.close(); }
