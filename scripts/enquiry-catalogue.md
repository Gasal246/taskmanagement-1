# Enquiry catalogue rollout

The Facility catalogue migration is dry-run by default:

```sh
npm run migrate:enquiry-catalogue
```

Review the counts and any unknown legacy Project Sector, Facility Type, solution, or Hotel Classification values. The migration never invents mappings for unknown values.

Apply the seed and legacy backfill with:

```sh
npm run migrate:enquiry-catalogue -- --apply
```

The migration uses stable keys and insert-only catalogue upserts, so reruns preserve administrator edits. It backfills generic Facility and solution detail values without replacing values already present.

For deployment, apply the catalogue seed before deploying runtime consumers. Pause Facility and enquiry writes while applying the legacy backfill, then deploy the application and rerun the migration as a final idempotency check.
