# Task activity timeline rollout

1. Pause task/activity writes on all application instances before deploying the new code.
2. Using the deployment's `MONGO_URI`, run `npm run migrate:task-activity-timelines` to inspect the dry-run counts.
3. Run `npm run migrate:task-activity-timelines -- --apply` while writes remain paused.
4. Deploy the new application and verify a task's inherited activity schedules, then resume writes.

The migration copies the parent's exact BSON dates to activity fields that do not exist yet. Existing activity schedules, including explicit nulls, are preserved. Missing or invalid parent dates become null and are reported in the summary; edit those activities to schedule them. Backfilling finishes before parent dates are recalculated. Task and activity creation/update timestamps are preserved, and reruns do not replace populated fields. Tasks without activities have both dates cleared.

The application calculates deadlines from the first and last activity by creation order, including activities hidden from a staff viewer. New activities need both timestamps; status and assignment changes do not. Scheduled deadlines now use clock time rather than end-of-day grace.
