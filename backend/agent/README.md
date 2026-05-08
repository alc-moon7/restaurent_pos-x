# Outlet Agent

The outlet agent is the local process that keeps each outlet resilient when internet connectivity is unstable.

Responsibilities:
- bootstrap outlet config, menu, tables, and device registration from Django
- poll sync and print-job endpoints with a device token
- buffer local actions with `idempotencyKey`
- deliver printer acknowledgements back to Django

Recommended runtime:
- Python service or lightweight Node daemon on the outlet admin machine
- local queue storage on disk
- automatic retry with exponential backoff

