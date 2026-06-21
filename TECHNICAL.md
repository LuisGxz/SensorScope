# SensorScope — technical overview

A deep-dive into the architecture and the decisions worth explaining. For setup and a feature tour see
[`README.md`](README.md).

## Solution shape

```
sensorscope/
├── backend/                            .NET 9 solution (Clean Architecture)
│   └── src/
│       ├── SensorScope.Domain          entities, enums, threshold logic (no dependencies)
│       ├── SensorScope.Application      interfaces, DTOs, services (auth, monitoring, ingest)
│       ├── SensorScope.Infrastructure   EF Core (Npgsql), reading queries, auth primitives
│       └── SensorScope.Api              controllers, SignalR hub, middleware, DI, telemetry simulator
│   └── tests/SensorScope.Tests          xUnit (Evaluate/IsOnline, auth, seed, threshold transitions, ingest)
├── frontend/                           Angular 20 (standalone + signals, dark-only)
│   └── src/app/{core, shared, features}
│   └── e2e/                            Playwright (auth, monitoring, tour)
└── docker-compose.yml                  TimescaleDB (port 5433)
```

Dependencies point inward (`Api → Infrastructure → Application → Domain`). Application talks to persistence
through `IAppDbContext` / `IReadingQueries`, so services are unit-testable against the EF in-memory provider.

## Time-series storage (the core)

- **Hypertable** — `readings` is promoted to a TimescaleDB hypertable at startup, **after** `MigrateAsync`
  and **before** the seed runs: `CREATE EXTENSION IF NOT EXISTS timescaledb` then
  `create_hypertable('readings', 'Time', if_not_exists => TRUE, migrate_data => TRUE)`. Creating it before
  seeding means every seeded reading is inserted directly onto the hypertable.
- **Composite key** — a hypertable must partition on a column that’s part of the primary key, so `Reading`
  has a composite PK `(DeviceId, Time)` and no surrogate id.
- **Bucketed series** — range queries aggregate with `time_bucket`, picking a bucket per range (1H→30s,
  6H→2m, 24H→10m, 7D→1h). `ReadingQueries` runs parameterized raw SQL via `db.Database.SqlQuery<T>`; because
  the schema is snake-case-mapped but the raw SQL references the EF column names, PascalCase columns are
  quoted (`"Time"`, `"Value"`, `"DeviceId"`) and the bucket is passed as `{bucket}::interval`.
- **Denormalized device state** — each `Device` carries `LastValue`, `LastReadingAt` and `CurrentLevel` so
  the dashboard renders instantly without scanning the hypertable; the full history stays in `readings`.

## Ingestion & the threshold engine

- **Ingest pipeline** — `IngestService` persists a `Reading`, updates the device’s denormalized state,
  evaluates the new level (`Device.Evaluate(value)`), and manages alert transitions in one place:
  - crossing into WARN/CRIT **raises** an alert;
  - WARN↔CRIT **escalates** (resolve the old alert, raise the new one);
  - returning to OK **resolves** the active alert.
  It then broadcasts a `ReadingReceived` and any `AlertRaised`/`AlertResolved` via `IMonitorBroadcaster`.
- **Direction-aware evaluation** — thresholds have a `ThresholdDirection` (Above/Below). `Evaluate` and the
  threshold-update validation both respect it, so “CRIT must be beyond WARN” means `crit > warn` for Above
  and `crit < warn` for Below.
- **Two ingestion paths** — operators never push data; devices do. `IngestByApiKeyAsync` resolves the device
  by the SHA-256 hash of the `X-Api-Key` header, so the public ingest endpoint needs no JWT.
- **Invariant formatting** — alert messages format values with `InvariantCulture` so a Spanish-locale host
  doesn’t emit comma decimals (`84,95°C`) into English copy.

## Real-time

- **Hub** — `MonitorHub` (`/hubs/monitor`, `[Authorize]`); connections join a single `"live"` group.
  Events: `ReadingReceived`, `AlertRaised`, `AlertResolved`.
- **JWT over WebSockets** — browsers can’t set an Authorization header on the WS handshake, so the bearer is
  read from the `access_token` query string for `/hubs` paths (`JwtBearerEvents.OnMessageReceived`).
- **Broadcaster boundary** — the Application layer depends on `IMonitorBroadcaster`; the Api implements it
  over `IHubContext<MonitorHub>`, keeping SignalR out of the domain/services.
- **Telemetry simulator** — `TelemetrySimulator` (a `BackgroundService`, gated by the `Simulator` flag)
  emits a value per device every 2s on a sine wave; “hot” devices oscillate around their thresholds so
  alerts rise and fall. It feeds the normal ingest pipeline, so the whole dashboard — values, charts and
  alerts — breathes for a solo visitor.

## Auth & authorization

- Passwords hashed with ASP.NET Identity’s `PasswordHasher<User>` behind an `IPasswordHasher` adapter.
- Short-lived JWT access tokens (HMAC-SHA256); refresh tokens are opaque, stored only as a SHA-256 hash, and
  **rotate** on refresh (old revoked + linked).
- Brute-force lockout after repeated failed logins (domain logic on `User`).
- Device ingestion is authorized separately by API key hash, never by JWT.

## Frontend

- **State** — a root `MonitorStore` subscribes once to the SignalR `reading$` stream and keeps the device
  list (values, levels, sparklines) fresh for every screen; the nav summary chips and the active-alert badge
  are derived signals. A persistent `ShellComponent` owns the realtime lifecycle and hosts the routed views.
- **Charts** — ApexCharts area series with a `datetime` axis; the device detail keeps a **live tail**
  (appending fresh readings, capped at 600 points) and draws WARN/CRIT **annotation lines**, with the y-axis
  padded so the WARN line stays in view even when a device sits well below it.
- **Guided demo** — a `DemoService` drives a coach-mark `TourComponent` (spotlight + tooltip, measured from
  `getBoundingClientRect`) and a “How to explore” slide-over; the tour auto-starts once per browser
  (`ss-tour-seen`), and `?` / `Esc` toggle/close it.
- **i18n** — a signal-based `I18nService` + impure `t` pipe; every string resolves EN/ES at runtime.

## Testing

- **Backend (29 xUnit):** `Evaluate` (Above/Below) and `IsOnline`; auth (lockout, refresh rotation); seed
  structure/levels/keys/idempotency; threshold transitions (raise, escalate resolving the old, resolve, no
  duplicate); ingest by valid/invalid API key. Services run against the EF in-memory provider.
- **Frontend (Playwright E2E):** sign-in + invalid credentials; open a device → chart + thresholds + range
  switch; **live value update over SignalR**; edit-threshold persistence; alerts filtering; and the guided
  demo (explore panel → tour, plus the first-visit auto-tour and the `/about` page). E2E seeds
  `ss-tour-seen` so the auto-tour doesn’t cover the UI.

## Notable trade-offs

- EF Core / Npgsql are pinned to **9.0.4** (the latest EF Core is v10 and needs net10).
- “Online” is derived from `LastReadingAt` recency (< 30s) rather than a heartbeat table — cheap, and the
  ingest pipeline keeps it accurate.
- Ambient telemetry is **simulated and ephemeral**; the API, hypertable and threshold engine are real.
