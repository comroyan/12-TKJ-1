# ClassHub XII TKJ 1 - Security Specification

This document defines the security requirements, data invariants, and access control matrices for ClassHub XII TKJ 1 to protect against identity spoofing, state bypassing, and privilege escalation.

## 1. Data Invariants & Access Control Matrix

- **Users**: Users can read any user profile. Only the owner can write to their own profile (excluding changing their role or status). Only Super Admin can write/edit other users, change roles, or activate/deactivate accounts.
- **Schedules & Pickets**: Read access for all signed-in users. Write access only for Super Admin and Sekretaris.
- **ClassFund & EventFunds**: Read access for all signed-in users. Create access for any user to upload proof of payment. Update access only for Super Admin and Bendahara. Delete access only for Super Admin.
- **Announcements & Agenda**: Read access for all. Write access for Super Admin and Wakil.
- **Tasks**: Read access for all. Write access for Super Admin and Sekretaris/Wakil.
- **Polls (Voting)**: Read access for all. Create/Close only for Super Admin. Voting (adding their vote to an option) is allowed for any signed-in user.
- **Gallery & Files**: Read access for all. Write access for Super Admin, and members can create their own uploads.
- **Meetings**: Read access for all. Write access for Super Admin and Sekretaris.
- **Inventory**: Read access for all. Write access for Super Admin. Members can update loan status to request/return borrowing.
- **Contacts**: Read access for all. Write access for Super Admin.
- **Settings**: Read access for all. Write access for Super Admin.
- **Logs**: Read access only for Super Admin. Write access allowed for system-generated operations (from verified clients or admins).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious payloads must be blocked by the security rules:

1. **Self-Promoted Admin**: A member tries to update their own role from `'Anggota'` to `'Super Admin'`.
2. **Double Voting**: A user attempts to vote twice on a poll option by adding multiple of their UIDs.
3. **Empty / Junk ID Poisoning**: Attempting to inject a 1MB string as a document ID.
4. **Bypass Lockout**: Editing a financial ledger entry that has been marked as `'approved'`.
5. **Unauthorized File Wiping**: A member attempting to delete files uploaded by other students or by admins.
6. **Spoofed Audit Logs**: A user trying to write fake audit logs or clear logs.
7. **Picket State Manipulation**: A member marking someone else's picket as "done" when it isn't theirs.
8. **Spoofed Payment Proof**: An unauthorized user changing another user's cash payment status to `'approved'`.
9. **Fake Contacts Insertion**: A user inserting junk contacts or modifying the WhatsApp numbers of Class Officers.
10. **System Settings Tampering**: A user modifying the class name, motto, or logo.
11. **Bypassing Verification**: Writing documents with future or past spoofed client timestamps instead of `request.time`.
12. **Future Tasks Creation**: Attempting to create tasks with a blank deadline or in an invalid format.

---

## 3. Security Rules Outline (Draft)

We will implement a rigorous `firestore.rules` enforcing these constraints.
