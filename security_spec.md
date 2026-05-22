# Security Specification (TDD)

## 1. Data Invariants

- **Read Access**: Any user can view the operational slide dashboards in real-time (readonly access to `yards`, `vessels`, `chartLeft`, `chartRight`, and `config`).
- **Write Access**: Only authenticated users with a verified email can execute create, update, or delete operations on any collection.
- **Value Integrity**: Numbers such as `capacity`, `cheio`, `vazio`, `arrivals`, and `backlog` must always be non-negative.
- **Identity Integrity**: All writes to global config must specify the user ID performing the change.

---

## 2. The "Dirty Dozen" Payloads
These are the 12 malicious payloads that our security rules must successfully reject:

### Payload 1: Anonymous Write to Config
- **Intent**: Modify global watermark text without being signed in.
- **Payload**: `setDoc(/config/global, { watermarkText: "SPOOFED_WATERMARK" })` (unauthenticated)
- **Result**: `PERMISSION_DENIED`

### Payload 2: Negative Yard Capacity Injection
- **Intent**: Corrupt yard metadata by setting a negative capacity value.
- **Payload**: `updateDoc(/yards/tecon, { capacity: -100 })`
- **Result**: `PERMISSION_DENIED`

### Payload 3: Excess Key Exploit (Shadow Fields)
- **Intent**: Add an undocumented property/privilege (e.g., `isAdmin: true` or `verified: true`) to a database object.
- **Payload**: `setDoc(/config/global, { language: "pt", slideTitlePT: "Title", slideTitleZH: "Title", watermarkText: "W", showWatermark: true, theme: "light", widescreenMode: true, slideWidth: 1480, ghostField: "EXPLOIT" })`
- **Result**: `PERMISSION_DENIED`

### Payload 4: Invalid Format ID Injection (ID Poisoning)
- **Intent**: Flood the database with extremely long arbitrary string IDs (Denial of Wallet).
- **Payload**: `setDoc(/vessels/MALICIOUS_ID_WITH_A_LOT_OF_CHARACTERS_THAT_IS_TOO_LONG_AND_CONTAINS_FORBIDDEN_CHARS_!!!!, { id: "1" })`
- **Result**: `PERMISSION_DENIED`

### Payload 5: Type Safety Violation in Vessel Capacity
- **Intent**: Set a non-numeric string value for container quantity.
- **Payload**: `updateDoc(/vessels/1, { cntrs: "ONE_MILLION_CONTAINERS" })`
- **Result**: `PERMISSION_DENIED`

### Payload 6: Modifying Immutable Server Properties (`createdAt`)
- **Intent**: Change the immutable creation time of a vessel state record.
- **Payload**: `updateDoc(/vessels/1, { createdAt: "2010-01-01T00:00:00Z" })`
- **Result**: `PERMISSION_DENIED`

### Payload 7: Fake Server Timestamp Cheat
- **Intent**: Bypass server coordination by providing a client-side hardcoded update timestamp.
- **Payload**: `updateDoc(/vessels/1, { updatedAt: "2099-01-01T00:00:00Z" })`
- **Result**: `PERMISSION_DENIED`

### Payload 8: Null values for required Yard fields
- **Intent**: Creating an invalid Yard card state with missing mandatory properties.
- **Payload**: `setDoc(/yards/new_test_yard, { name: "Test" })` (missing capacity, filled, empties, etc.)
- **Result**: `PERMISSION_DENIED`

### Payload 9: Invalid String Format for Vessel ETA
- **Intent**: Corrupting dates by injecting bad formats that could break downstream parsers.
- **Payload**: `updateDoc(/vessels/1, { eta: 99999 })`
- **Result**: `PERMISSION_DENIED`

### Payload 10: Invalid enum for Config Theme
- **Intent**: Set theme to an unsupported value.
- **Payload**: `updateDoc(/config/global, { theme: "cosmic-blue-ultra" })`
- **Result**: `PERMISSION_DENIED`

### Payload 11: Maliciously Deleting Global Config Singleton
- **Intent**: Erase slide settings, blocking presentation mode for all concurrent users.
- **Payload**: `deleteDoc(/config/global)`
- **Result**: `PERMISSION_DENIED`

### Payload 12: Unauthorized Array Injection
- **Intent**: Try to inject unstructured sub-arrays to cause UI memory strain.
- **Payload**: `updateDoc(/yards/tecon, { customArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })`
- **Result**: `PERMISSION_DENIED`

---

## 3. Test Runner Design

We will secure all paths using explicit, type-safe security functions verified against these test conditions:

```typescript
// Conceptual firestore.rules.test.ts implementation diagram
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  it('blocks anonymous writes to global config', async () => {
    const db = getAnonymousDb();
    await assertFails(db.doc('config/global').set({ watermarkText: 'SPOOFED' }));
  });

  it('allows verified authenticated users to update config keys', async () => {
    const db = getAuthenticatedDb({ uid: 'user123', email_verified: true });
    await assertSucceeds(db.doc('config/global').update({ watermarkText: 'H2LUIZ-VI' }));
  });
});
```
