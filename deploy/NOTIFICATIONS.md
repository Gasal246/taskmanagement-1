# Notification worker on a VPS

The web application saves inbox entries and queued delivery jobs together. Device push and opt-in reminders require this worker. Do not run a worker against a different environment's database.

## Deploy

1. Deploy the updated web app and worker source together. Keep the usual MongoDB/Firebase environment variables. Set `APP_URL` to the public HTTPS origin. Email reminders are optional; they additionally need `NEXT_NODEMAILER_USER` and `NEXT_NODEMAILER_PASS`. Preferences default to email disabled.
2. Run `node scripts/migrate-notification-retention.mjs --apply` to replace the old creation-date TTL. This is required: changing the Mongoose schema alone does not remove an existing TTL index. Run `node scripts/create-performance-indexes.mjs --apply` to create other declared indexes.
3. Choose one worker supervisor:
   - Existing PM2 VPS: `pm2 start deploy/ecosystem.notifications.cjs`, then `pm2 save`. Configure PM2 startup for the deployment user if not already configured. Runtime needs the repository's TypeScript dependency; do not omit it from the worker installation.
   - Docker VPS: provide `.env.production`, then `docker compose -f deploy/compose.notifications.yml up -d --build`. The worker container restarts after process failure and server reboot when Docker starts.
4. Check `node scripts/notification-worker-health.mjs` and the superadmin Background jobs screen. A missing heartbeat or queue delay over five minutes needs attention.
5. Connect the protected `/api/internal/jobs/health` endpoint to the VPS/external uptime monitor using the existing job-runner authorization secret. Alert via a channel independent of this notification queue: a stopped worker cannot send its own push warning. Health returns HTTP 503 when unhealthy. Never put the secret in the URL.

Starting the worker delivers pending notifications; inspect the queue before starting it. No scheduler is necessary when the continuous worker runs. The existing protected job-runner endpoint remains available for scheduled deployments.

## Behavior

- Unread notifications have no expiry. Read/archived entries expire after 30 days.
- A durable inbox ID links the inbox, device notification and detail page. Push messages are data-only, with one service-worker display path.
- Unread action-required items receive up to three reminders, at the user's chosen interval; read/archived/snoozed items are checked again before sending. Email requires explicit user opt-in. Reminders do not complete tasks.
- Inspect failed jobs at `/superadmin/jobs`; retry only after fixing the cause. A provider accepting a message is not evidence that the user read it.
