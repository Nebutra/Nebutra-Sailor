# fal.docs — Model API docs
- **O (documented)** Queue lifecycle IN_QUEUE(position) -> IN_PROGRESS(logs) -> COMPLETED(metrics, error?, error_type?); cancel semantics; 10 automatic retries; no queue size limit. Evidence: docs.queue.webp
- **O (documented)** Webhooks: status OK/ERROR, gateway_request_id, 31 retries w/ backoff, 3xx permanent failure, private IPs dropped. Evidence: docs.webhooks.webp
- **O (documented)** 13 error_type values; payload retention 30d; media expiration header; X-Fal-Store-IO: 0. Evidence: docs.request-errors.webp, docs.media-expiration.webp
- See business/jobs.md.
