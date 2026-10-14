# Activity upload deployment

Activity comment attachments must be smaller than 5 MiB. Activity documents can be up to and including 10 MiB. Each file is uploaded separately. The entire multipart request is slightly larger than the file.

The application now configures Next.js middleware to buffer 11 MiB. Rebuild and restart the web application to apply `next.config.mjs` changes. The route still enforces file type, size and task permissions independently.

## Nginx

Inspect the active configuration using `sudo nginx -T` and locate the HTTPS server for this application. Nginx defaults to `client_max_body_size 1m`, which rejects larger files before Next.js can return a JSON error. A lower value in a `location` overrides the value in its enclosing `server`.

If the site already has an exact `/api/task/activity-files` location, update it rather than adding a duplicate. Otherwise merge `deploy/nginx/activity-uploads.conf` into that HTTPS server block. Match `proxy_pass` and any existing access controls/custom proxy settings to the site's existing upstream; the sample assumes `127.0.0.1:3000`. Set the request limit to `11m`. Apply the equivalent setting to any other proxy in front of Nginx.

After saving the server configuration:

```sh
sudo nginx -t
# Only if validation succeeds:
sudo systemctl reload nginx
```

Do not replace the entire production server block with the sample. Do not disable request-size validation globally.

## Verification

As an authorized user on a test activity, upload images of 500 KiB, 2 MiB and just under 5 MiB in comments. Upload documents of 2 MiB and exactly 10 MiB. Confirm both the saved record and download work. Check that a 5 MiB comment attachment and a document over 10 MiB are rejected with the file-limit message. In browser Network, a proxy rejection is HTTP 413; Nginx logs commonly report `client intended to send too large body`. The UI now translates non-JSON proxy errors into useful messages.

Local regressions (no production storage/database writes):

```sh
node --test tests/query/upload-errors.test.cjs tests/tasks/upload-middleware.test.cjs tests/tasks/activity-files-access.test.cjs
```

These verify the real Next.js middleware truncation at the old default limit, multipart boundary overhead with the new setting, route authorization/file limits, and proxy/network error messages. Production proxy settings must be checked on the host; changing application source alone cannot alter them.
