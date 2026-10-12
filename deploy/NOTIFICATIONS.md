# Notification worker on a VPS

The web application saves inbox entries and queued delivery jobs together. Device push and opt-in reminders require this worker. Do not run a worker against a different environment's database.

## Deploy

1. Deploy the updated web app and worker source together. Keep the usual MongoDB/Firebase environment variables. Set `APP_URL` to the public HTTPS origin. Email reminders are optional; they additionally need `NEXT_NODEMAILER_USER` and `NEXT_NODEMAILER_PASS`. Preferences default to email disabled.
2. Run `node scripts/migrate-notification-retention.mjs --apply` to replace the old creation-date TTL. This is required: changing the Mongoose schema alone does not remove an existing TTL index. Run `node scripts/create-performance-indexes.mjs --apply` to create other declared indexes.
3. Choose one worker supervisor:
   - Existing systemd VPS (`/var/www/taskmanagement`, Node at `/usr/bin/node`): install `deploy/taskmanager-notifications.service` into `/etc/systemd/system/`, run `systemctl daemon-reload`, then `systemctl enable --now taskmanager-notifications`. The provided unit uses the same root account as this deployment's web service; adjust `User` and paths for other servers. It loads `.env.production` through the application environment loader, restarts after failure, and starts after reboot. Do not also start a PM2 or Docker worker.
   - Existing PM2 VPS: `pm2 start deploy/ecosystem.notifications.cjs`, then `pm2 save`. Configure PM2 startup for the deployment user if not already configured. Runtime needs the repository's TypeScript dependency; do not omit it from the worker installation.
   - Docker VPS: provide `.env.production`, then `docker compose -f deploy/compose.notifications.yml up -d --build`. The worker container restarts after process failure and server reboot when Docker starts.
4. Check `node scripts/notification-worker-health.mjs` and the superadmin Background jobs screen. A missing heartbeat or queue delay over five minutes needs attention.
5. Connect the protected `/api/internal/jobs/health` endpoint to the VPS/external uptime monitor using the existing job-runner authorization secret. Alert via a channel independent of this notification queue: a stopped worker cannot send its own push warning. Health returns HTTP 503 when unhealthy. Never put the secret in the URL.

Starting the worker delivers pending notifications; inspect the queue before starting it. No scheduler is necessary when the continuous worker runs. The existing protected job-runner endpoint remains available for scheduled deployments.

### Updating the systemd deployment

Stop the worker before replacing its dependencies or source. After installing the locked dependencies and successfully building the app, restart both services:

```bash
cd /var/www/taskmanagement
systemctl stop taskmanager-notifications
git pull origin main
npm ci --legacy-peer-deps
npm run build
# Run these only after the install and build succeed:
systemctl restart taskmanager
systemctl start taskmanager-notifications
NODE_ENV=production node scripts/notification-worker-health.mjs
```

The repository's dependency tree currently requires `--legacy-peer-deps` (as documented in the README). If installation or build fails, investigate before restarting the web app; do not leave the worker stopped after recovery. Inspect worker logs with `journalctl -u taskmanager-notifications`. The HTTP health endpoint additionally requires a `CRON_SECRET` of at least 32 characters and a matching Bearer header; keep it out of logs and URLs. The CLI check does not require this secret. External uptime alerts must be configured separately.

## Behavior

- Unread notifications have no expiry. Read/archived entries expire after 30 days.
- A durable inbox ID links the inbox, device notification and detail page. Push messages are data-only, with one service-worker display path.
- Unread action-required items receive up to three reminders, at the user's chosen interval; read/archived/snoozed items are checked again before sending. Email requires explicit user opt-in. Reminders do not complete tasks.
- Inspect failed jobs at `/superadmin/jobs`; retry only after fixing the cause. A provider accepting a message is not evidence that the user read it.
