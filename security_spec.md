# Security Specification: Reflections Journal

## 1. Data Invariants
- **Owner Bound Isolation**: All journal reflections and interactions reside under `/users/{userId}/interactions/{interactionId}`.
- **Identity Integrity**: Read and write operations are strictly permitted only when `request.auth != null && request.auth.uid == userId`.
- **Zero Cross-User Leakage**: No user may query, list, retrieve, modify, or delete another user's interactions.
- **Default Deny Catch-All**: Any unspecified path in Cloud Firestore is strictly denied by default.

## 2. The "Dirty Dozen" Threat Scenarios
1. **Unauthenticated Read**: Request without Auth token attempts to list `/users/{userId}/interactions` -> `PERMISSION_DENIED`.
2. **Cross-User Snooping**: User `alice_123` attempts to get `/users/bob_456/interactions/doc_1` -> `PERMISSION_DENIED`.
3. **Cross-User Modification**: User `alice_123` attempts to update `/users/bob_456/interactions/doc_1` -> `PERMISSION_DENIED`.
4. **Cross-User Deletion**: User `alice_123` attempts to delete `/users/bob_456/interactions/doc_1` -> `PERMISSION_DENIED`.
5. **Cross-User Injection**: User `alice_123` attempts to create an interaction inside `/users/bob_456/interactions/doc_2` -> `PERMISSION_DENIED`.
6. **Root Path Query**: User queries root collection groups or arbitrary collection paths `/interactions` -> `PERMISSION_DENIED`.
7. **Spoofed UID in Payload**: User `alice_123` writes document with `userId: "bob_456"` into `alice_123` path -> Isolated to Alice, cannot affect Bob.
8. **Malicious Path Traversal**: Request attempting document IDs containing special characters or traversal sequences -> Path isolation enforced by Firestore engine.
9. **Blanket Query Scraping**: User attempts collection query without specifying their own user collection -> `PERMISSION_DENIED`.
10. **Token Tampering / Invalid Auth**: User with invalid or expired Firebase token -> `PERMISSION_DENIED`.
11. **Direct Backend API Key Extraction**: Client attempt to read `GEMINI_API_KEY` -> Rejected; key is strictly server-side in environment / Secret Manager.
12. **Ghost Document Poisoning**: Attacker tries writing to random collection `/system_config/secrets` -> Default deny blocks request -> `PERMISSION_DENIED`.
