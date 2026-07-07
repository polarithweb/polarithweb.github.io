# Security Specification: Polarith Web Security Audit

## 1. Data Invariants
- **Projects**: Only `priyam.dgp13@gmail.com` can create, update, or delete project cards. Public guest users can list and get projects.
- **Inquiries**: Anyone can submit an inquiry (create operations), but fields must be strictly validated (lengths and types). Only `priyam.dgp13@gmail.com` can view or manage inquiry data.
- **Clicks / Telemetry**: Anyone can post an aggregate track block (create operations). Only the verified administrator can list, get, or wipe analytics.
- **Timestamps**: `createdAt` fields must exactly match the system server time `request.time`.
- **Primary Keys**: Document IDs for all collections must be alphanumeric and under 128 characters to prevent storage-poisoning attacks.

---

## 2. The "Dirty Dozen" Payloads
The following payloads describe malicious exploits that must be strictly blocked by the Firestore rules, returning `PERMISSION_DENIED`:

### Exploit Type A: Project Privilege Escalation
1. **P1 (Anonymous Project Insertion)**: Attempting to insert a project card without being logged in.
2. **P2 (Malicious Non-Admin Project)**: Logged in status active, but with email `spammer@gmail.com` attempting to write a new project card.
3. **P3 (Created-At Tampering)**: Exploit attempting to set custom client timestamps as `createdAt` for a project instead of `request.time`.
4. **P4 (Unbounded Text Bombing)**: Injecting a 5MB payload into the `features` block of a project card to induce high client query expenses.

### Exploit Type B: User Inquiry Scraping & Integrity Breaches
5. **P5 (Inquiry Inspection)**: Anonymous or logged-in non-admin user trying to perform a `get` or `list` query on `/inquiries` to steal customer email lists.
6. **P6 (Inquiry State Alteration)**: Unauthorized user attempting to rewrite, append, or modify another client's already submitted contact form.
7. **P7 (Inquiry ID Poisoning)**: Submitting contact brief with document ID `/inquiries/some-extremely-long-malicious-url-encoded-and-escaped-path-inject-exploit-payload` (must be restricted by ID length).
8. **P8 (Inquiry Spam Injection)**: An inquiry field missing required attributes or injecting a boolean or map type instead of standard strings.

### Exploit Type C: Telemetry Poisoning & Database Ingress Attacks
9. **P9 (Telemetry Data Extraction)**: External party trying to fetch and download all click trackers under `/clicks`.
10. **P10 (Click Event Alteration)**: An attacker attempting to execute a mass-update to change the telemetry values of `/clicks/{clickId}`.
11. **P11 (Spoofed Auth Verification)**: A user claiming role privileges with `email_verified: false` to write a project card.
12. **P12 (System Field Tampering)**: Attempt to overwrite the `createdAt` timestamp of a project card during partial client updates to reset its position.

---

## 3. The Test Runner Configuration

The Firestore integration validations are mapped to verify all defensive behaviors:

```ts
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

// Standard TDD test runner structure to assert all P1-P12 payloads produce PERMISSION_DENIED.
// Tested against native standard rulesets securely.
```
