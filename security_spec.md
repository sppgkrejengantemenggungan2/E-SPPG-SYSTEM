# E-SPPG Security Specification & Data Invariants

## 1. Core Data Invariants
1. **Identity & Authentication**: Only authenticated users with valid accounts can perform reads and writes. Administrative operations require authorized roles (Admin Utama, Kepala SPPG).
2. **Immutability of Audit Logs**: Audit logs cannot be updated or deleted once written.
3. **Idempotent Stock Updates**: Receiving checklist can only credit inventory once and requires verified status.
4. **PO & RAB Integrity**: Purchase orders cannot be modified after final approval or payment without elevated authorization.
5. **Beneficiary Snapshot Preservation**: Historical beneficiary records are preserved and cannot be overwritten silently.
6. **Cash Ledger Integrity**: Cash transactions must have valid types ('masuk' or 'keluar'), positive amounts, and cannot have negative totals without authorization.
7. **Organoleptic & Quality Verification**: Organoleptic records cannot be tampered with once marked signed.
8. **Division Operations Accountability**: Division shift tasks record responsible officers, verified timestamps, and immutable shift logs.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: An unauthenticated client attempting to create an SPPG profile or menu.
2. **Ghost Admin Escalation**: A standard volunteer user attempting to grant themselves `role: "Admin Utama"`.
3. **Audit Log Deletion**: An authenticated user attempting to delete an audit log entry.
4. **Negative Amount Injection**: A cash transaction payload with a negative amount `-5000000` to spoof income.
5. **Oversized String Buffer Overflow**: An entity with an institutionName of 500,000 characters.
6. **RAB Approval Spoofing**: A non-authorized user attempting to force `status: "Disetujui"` on an unapproved RAB.
7. **Orphan Inventory Mutation**: An inventory transaction created with a non-existent or blank `ingredientId`.
8. **Double Receipt Injection**: Re-submitting an already processed checklist with duplicated transaction IDs.
9. **Tampered Organoleptic Conclusion**: Overriding organoleptic evaluation results by an unauthorized third-party.
10. **Malicious Path Injection**: Writing to arbitrary collection paths outside defined schemas (e.g., `/{document=**}`).
11. **Negative Food Waste Weight**: A food waste record with negative kilograms `-100 kg`.
12. **Unauthorized PII Exfiltration**: Anonymous querying of volunteer bank accounts and phone numbers.
