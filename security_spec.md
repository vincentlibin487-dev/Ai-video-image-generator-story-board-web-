# Firestore Security Specification & Red-Team Audit

## 1. Data Invariants
1. **Zero Unauthorized Reads on Telemetry & Search Logs**: `/visitor_sessions/{sessionId}` and `/generation_logs/{logId}` allow bounded `create` from clients, while `get`, `list`, and `delete` are strictly locked to the verified administrator (`isBootstrappedAdmin()` / `isAdmin()`). Unauthenticated clients cannot spoof another user's email inside logs (`incoming().userEmail == ''` unless signed in with matching verified email).
2. **PII Isolation on Signed-In User Accounts**: `/user_accounts/{uid}` stores Google-verified Gmail profile metadata (`uid`, `email`, `displayName`, `photoURL`, `loginCount`, `savedStoriesCount`, `lastDayKey`). Only the verified account owner (`request.auth.uid == uid`) or verified admin may `get` or `delete`; only verified bootstrapped admin may `list`. Passwords are NEVER collected or stored (authentication is handled solely via Firebase Google OAuth).
3. **Master Gate & Owner Enforcement on Synced Stories / ❤️ History**: `/user_accounts/{uid}/saved_stories/{storyId}` enforces `exists(/databases/$(database)/documents/user_accounts/$(uid))` on writes, binds `ownerUid == request.auth.uid` and `ownerEmail == request.auth.token.email` immutably, and validates array bounds (`shots.size() >= 0 && shots.size() <= 500`), string sizes, `isLoved` boolean flag, and server timestamps.
4. **Bootstrapped Admin Isolation**: `/admins/{uid}` modifications are restricted strictly to the verified bootstrapped administrator (`amalj7767@gmail.com` with `email_verified == true`).
5. **Append-Only Video Editor Telemetry**: `/video_edit_logs/{editId}` allows bounded `create` for editor activity (`open_editor`, `add_media`, `edit_timeline`, `export_video`) with strict field validation and verified Gmail anti-spoofing, while `get`, `list`, and `delete` are strictly locked to verified admin and `update` is permanently disabled (`false`).

## 2. Adversarial Audit ("Dirty Dozen" Payloads)
1. **Unauthenticated `list` on `/visitor_sessions`, `/user_accounts`, `/generation_logs`, or `/video_edit_logs`** -> `PERMISSION_DENIED` (`isBootstrappedAdmin()` required).
2. **Unauthenticated `get` on `/generation_logs/{id}` or `/video_edit_logs/{id}`** -> `PERMISSION_DENIED` (`isAdmin()` required).
3. **Email Spoofing (`email == 'amalj7767@gmail.com'`, `email_verified == false`)** -> `PERMISSION_DENIED`.
4. **Email Spoofing in `generation_logs` / `video_edit_logs` (`userEmail: "victim@gmail.com"` when guest or another user)** -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection (`{ ..., isAdmin: true }`)** -> `PERMISSION_DENIED` (`keys().hasOnly(...)` & `affectedKeys().hasOnly(...)`).
6. **ID Poisoning (`logId`, `editId`, or `storyId` > 128 chars or invalid chars)** -> `PERMISSION_DENIED` (`isValidId()`).
7. **Timestamp Forgery (`createdAt` or `updatedAt` != `request.time`)** -> `PERMISSION_DENIED`.
8. **Type / Value Poisoning (`shots: ["bad"]` or `searchPremise > 5000` chars or invalid `resolution`)** -> `PERMISSION_DENIED`.
9. **Orphaned Story Write (missing parent `/user_accounts/{uid}`)** -> `PERMISSION_DENIED`.
10. **Immutable Field Hijack (`ownerUid`, `createdAt`, or modifying `/generation_logs` / `/video_edit_logs`)** -> `PERMISSION_DENIED` (`allow update: if false;`).
11. **Self-Assigned Admin Privilege Escalation (`create` on `/admins/{uid}`)** -> `PERMISSION_DENIED`.
12. **Arbitrary Collection Write (`/other/123`)** -> `PERMISSION_DENIED` (Global catch-all default deny).
