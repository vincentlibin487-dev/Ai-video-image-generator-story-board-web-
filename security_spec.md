# Firestore Security Specification & Red-Team Audit

## 1. Data Invariants
1. **Zero PII in Anonymous Telemetry**: `/visitor_sessions/{sessionId}` stores only pseudonymous browser IDs (`visitorId`, `sessionId`), enum language/device tags, hostname referrer, step state, integer activity counters, and server timestamps (`request.time`). No names, emails, IP addresses, or user story prompts are persisted.
2. **Write-Only for Unauthenticated Guests, Read-Only for Verified Admin**: Unauthenticated users may `create` or monotonically `update` their own session document with strict schema, enum, string-length, integer-range, and server-timestamp enforcement. Only an authenticated admin with `request.auth.token.email_verified == true` may `get`, `list`, or `delete` session telemetry.
3. **Immutable Session Identity**: Once created, `sessionId`, `visitorId`, `visitNumber`, `isReturning`, `deviceType`, `screenCategory`, `referrerSource`, `dayKey`, and `createdAt` cannot be modified by non-admin clients.
4. **Bootstrapped Admin Isolation**: `/admins/{uid}` modifications are restricted strictly to the verified bootstrapped administrator (`amalj7767@gmail.com` with `email_verified == true`). Self-assignment of admin roles is impossible.

## 2. Adversarial Audit ("Dirty Dozen" Payloads)
1. **Unauthenticated `list` on `/visitor_sessions`** -> `PERMISSION_DENIED` (`isBootstrappedAdmin()` requires signed-in verified admin email).
2. **Unauthenticated `get` on `/visitor_sessions/{id}`** -> `PERMISSION_DENIED` (`isAdmin()` false).
3. **Email Spoofing (`email == 'amalj7767@gmail.com'`, `email_verified == false`)** -> `PERMISSION_DENIED` (`isVerifiedUser()` mandates `email_verified == true`).
4. **Signed-in Non-Admin User reading `/visitor_sessions`** -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection (`{ ..., isAdmin: true }` on `visitor_sessions` create/update)** -> `PERMISSION_DENIED` (`keys().hasOnly(...)` & `affectedKeys().hasOnly(...)` reject extra keys).
6. **ID Poisoning (`sessionId` > 128 chars or containing `/` / `$`)** -> `PERMISSION_DENIED` (`isValidId(sessionId)` enforces `^[a-zA-Z0-9_\-]+$` and length `4..128`).
7. **Timestamp Forgery (`createdAt` or `updatedAt` != `request.time`)** -> `PERMISSION_DENIED`.
8. **Type / Value Poisoning (`anglesGeneratedCount: "999"` or `999999`)** -> `PERMISSION_DENIED` (`is int`, bounded `<= 1000`, delta `<= +10`).
9. **Counter Rollback (`anglesGeneratedCount < existing().anglesGeneratedCount`)** -> `PERMISSION_DENIED`.
10. **Immutable Field Hijack (`visitorId` or `createdAt` modified on `update`)** -> `PERMISSION_DENIED`.
11. **Self-Assigned Admin Privilege Escalation (`create` on `/admins/{uid}` by non-admin)** -> `PERMISSION_DENIED` (`isBootstrappedAdmin()` required).
12. **Arbitrary Collection Write (`/users/123` or `/anything_else/123`)** -> `PERMISSION_DENIED` (Global catch-all `match /{document=**} { allow read, write: if false; }`).
