# BuiltBasis v1 — Records Design

> **Document type:** Design document
> **Status:** Approved (2026-10-02, project owner). Revised 2026-10-02 after independent design review (sharing, required fields, verification, security, backups, files, measurements, severity, Greek labels).
> **Scope:** BuiltBasis v1 — records (Quality Issue, Detail Clarification, Task), their fields, value lists, rules, screens, sharing, PDF, hosting and operations.
> **Retention:** Implementation baseline for the v1 specification and implementation plan. Becomes historical after v1 delivery and reconciliation (DOCS-STANDARD §2).
> **Governed by:** `docs/VISION.md` (intent), `docs/adr/0001-v1-stack-and-hosting.md` (stack).
> **Input (non-authoritative):** `docs/research/2026-10-02-issue-and-clarification-tracking-research.md`.

---

## 1. Purpose

BuiltBasis is a lightweight construction-control application for an owner-run project. At the close-out stage of a construction project two things happen continuously:

1. **Correcting problems in built work** — defects, nonconformances, incomplete work, damage.
2. **Instructing before work happens** — clarifying a detail before it is built, so that problems are prevented.

Plus ordinary work items that are neither (purchases, arrangements, checks).

v1 lets the owner record, classify, measure, decide, evidence and track these items in one place, on desktop and phone, in English and Greek, and share individual records read-only with the architect, contractors and subcontractors.

The first project using it is Gennadi 822A (three villas, Rhodes). Nothing in the design is specific to that project; project-specific content (locations, trades, tags, people) is data.

## 2. Users and access

| Who | How | Can |
|---|---|---|
| **Owner** (one account) | Logs in | Everything: create, edit, classify, decide, share, configure lists |
| **Anyone holding a share link** | Opens a link, no account | View one record, read-only, without private content |

- There are no other accounts in v1. Nobody but the owner writes to the system.
- **Private content** is visible only to the logged-in owner and is never included in share links or PDFs: the _Outside contract scope_ flag, _Estimated cost_, the _Notes_ field (§5.1), and log entries marked private together with their attachments (§5.11).

## 3. Language

- **Every fixed value and every UI label exists in English and Greek.** The whole interface switches language at any time.
- **Every value in every fixed list has a short definition** in both languages (given in §7). How definitions are presented (inline help, tap, hover) is decided at implementation; hover alone is insufficient because phones have no hover.
- **Managed lists** (trades, tags, location nodes, zone types) have an English and a Greek name; if one is empty, the other is shown.
- **Text the user types** (titles, descriptions, instruction text, notes, log entries, measurement labels) is stored and shown exactly as typed. It is never translated.
- Values are stored as **language-neutral codes** (e.g. `in_progress`); labels and definitions are looked up from the code.
- Language preference: the owner's choice is remembered. Share-link pages open in Greek by default and offer a language switch.

## 4. Record model

### 4.1 One generic record, three subtypes

Every item in BuiltBasis is a **Record**. Each record has exactly one **subtype**:

| Subtype | ID prefix | What it is |
|---|---|---|
| **Quality Issue** | `QI-` | Something wrong with work that has already been built. |
| **Detail Clarification** | `DC-` | An instruction or detail agreed **before** something is built, to prevent problems. |
| **Task** | `T-` | Any other piece of work to track. |

All subtypes share one structure (§5). Each subtype adds a few fields of its own (§6).

**Boundary between Quality Issue and Detail Clarification** — the deciding question is _has it been built yet?_

- Nothing built yet; something needs to be defined or agreed → **Detail Clarification**.
- Already built, and something is wrong — including when the cause is the design → **Quality Issue**.
- A Detail Clarification stays a Detail Clarification for its whole life; only its status changes.

### 4.2 Identifiers

- Every record has an internal numeric ID (never shown, never reused).
- Every record has a **human ID**: subtype prefix + 4-digit sequence **per project per subtype**, e.g. `QI-0001`, `DC-0007`, `T-0012`. Assigned at creation (including Draft), never reused, never changed.

### 4.3 Relationships between records

Records are **not linked to each other** in v1, with one exception:

- **Must be done before** (_Να γίνει πριν_): a record can name one or more other records of the same project that it must precede. The other record shows the reverse as **Requires first** (_Απαιτείται πρώτα_).
  - Any subtype can precede any subtype. Downstream work that is not otherwise a record (e.g. "Basement tiling") is created as a **Task** so it can be selected.
  - A record cannot precede itself. A link that would create a cycle is rejected.
  - The relationship is informational in v1: it does not block status changes. It is visible on both records and filterable ("records that must be done before X", "records that still block something").

All other references to other records (the requirement a nonconformance breaks, the record that replaces a cancelled one) are written as text in the **Reference** field, e.g. "Deviates from DC-0012".

## 5. Shared fields (all subtypes)

Field privacy: **P** = private (owner only). Shared record pages show every non-private field. The A3 print view / PDF shows exactly the fields listed in §12.

**Required fields** marked "required in active statuses" must be filled in every status except Draft, Cancelled and Superseded, which may be incomplete. The server enforces this on every save (§8.2).

### 5.1 Core

| Field | Greek | Type | Rules |
|---|---|---|---|
| Subtype | Υποκατηγορία | code (§7.1) | Required. Cannot change after creation. |
| ID | Κωδικός | `QI-0001` etc. | Generated (§4.2). |
| Title | Τίτλος | text, ≤ 200 chars | Required in active statuses. |
| Description | Περιγραφή | long text | Optional. Describes the matter and, where relevant, the exact physical item (e.g. "left side of the west balcony door frame"). |
| Status | Κατάσταση | code (§7.2) | Required. Rules in §8. |
| Status reason | Αιτιολογία κατάστασης | code (§7.3 / §7.4) + note | Required when status is On hold or Cancelled. |
| Reference | Αναφορά | text | Free text: drawings, documents, other record IDs. |
| Notes | Σημειώσεις | long text | Optional. **P.** Free-text working notes, separate from the Log (§5.11). |
| Created / updated | Δημιουργία / ενημέρωση | timestamps + user | Automatic. |

### 5.2 People and responsibility

| Field | Greek | Type | Rules |
|---|---|---|---|
| Ball in court | Επόμενη ενέργεια από | one entry from the people list (§9.1) | Optional. **Who must act next.** Set manually by the owner. Every change is logged with its date (§5.12), so the time someone has held the ball is visible. |
| Responsible | Υπεύθυνος | one entry from the people list | Optional. The company or person responsible for doing the work. |
| Trades | Ειδικότητες | one or more from the trades list (§9.2) | Optional. Several allowed: a record can need a combination of trades. |

### 5.3 Classification and planning

| Field | Greek | Type | Rules |
|---|---|---|---|
| Severity | Σοβαρότητα | code (§7.9) | Optional. How serious the consequences are. |
| Priority | Προτεραιότητα | code (§7.10) | Optional; empty means none. How soon to act. |
| Due date | Προθεσμία | date | Optional. |
| Completion | Ολοκλήρωση | 0–100, steps of 10 | Optional. Shown as a progress bar. Independent of status (e.g. a multi-part correction 60% done). |
| Safety implications | Θέμα ασφαλείας | checkbox | Shown as a badge; filterable. |
| Tags | Ετικέτες | zero or more from the tag list (§9.3) | Groupings ("thematic groups"). |
| Must be done before | Να γίνει πριν | zero or more other records | §4.3. |

### 5.4 Commercial (private)

| Field | Greek | Type | Rules |
|---|---|---|---|
| Outside contract scope | Εκτός σύμβασης | checkbox | **P.** Ticked when the work is outside the existing contract (extra work or change). |
| Estimated cost (€) | Εκτιμώμενο κόστος (€) | number, 2 decimals | **P.** Shown and editable only when _Outside contract scope_ is ticked. Unticking keeps the stored value but hides it and excludes it from totals; re-ticking shows it again. List totals sum non-empty estimates of records currently marked _Outside contract scope_ only. |

### 5.5 Location

| Field | Greek | Type | Rules |
|---|---|---|---|
| Location | Θέση | one or more nodes of the project's location tree (§9.4) | Optional (a project-wide record may leave it empty). |

Rules:

1. **Ticking a node means the record concerns that place as a whole** (or in general). Ticking "Villa 2" means the whole villa — not "somewhere inside it, unknown where".
2. **Filtering on a node returns records ticked on that node or on any node inside it.** A filter on "Villa 2" includes records ticked on Villa 2's kitchen.
3. A record ticked on several nodes appears **once** in any list and is **counted once**.
4. The location tree stops at room/space level. **Physical items** (a door frame, its left side, a step, a roof edge) are **not** modelled; they are described in the Description and in measurement item labels.

### 5.6 Decision and instruction

Shown for Quality Issues and Detail Clarifications; not shown for Tasks.

| Field | Greek | Type | Rules |
|---|---|---|---|
| Options considered | Εξεταζόμενες λύσεις | list of options: short label + description | Optional. Any number. Proposals (including cheaper alternatives) are kept even when rejected. |
| Chosen option | Επιλεγμένη λύση | one of the options | Optional. |
| Decided by | Αποφάσισε | one entry from the people list | Optional; **required** for a QI whose disposition is _Repair_ or _Accept as is_ (§6.1). May be the owner. |
| Decided on | Ημερομηνία απόφασης | date | Optional; **required** under the same condition as _Decided by_. |
| Instruction text | Κείμενο εντολής | long text | Optional. **Stored exactly as issued** (original language, original wording). Never rewritten by translation. Editable; every change is logged with the previous and the new text, author and time (§5.12). Record and PDF show the current text. |

### 5.7 Measurements

A record can hold any number of **measurement sets**; each set holds any number of **rows**. Nothing about _what_ is measured is predefined.

**Measurement set**

| Field | Greek | Type | Rules |
|---|---|---|---|
| Date | Ημερομηνία | date | Required. |
| Measured by | Μέτρησε | one entry from the people list | Optional. |
| Phase | Φάση | code (§7.13) | Required. Before / After / Other. |
| Note | Σημείωση | text | Optional. |

**Measurement row**

| Field | Greek | Type | Rules |
|---|---|---|---|
| Item | Αντικείμενο | free text | Required. What physical thing was measured, e.g. "Left side of frame", "Stair, 3rd step". |
| Quantity | Μέγεθος | free text | Required. What was measured, e.g. "Stone thickness", "Width", "Slope". |
| Value | Τιμή | number | Required. |
| Unit | Μονάδα | code (§7.14) | Required. |
| Note | Σημείωση | text | Optional. |

**Label suggestions.** When typing _Item_ and _Quantity_, the field suggests labels already used in the same record, so the same thing is labelled identically across sets.

**Rules:**

- **Matching:** labels match when equal after trimming, collapsing internal whitespace and ignoring letter case. Rows with different units are never compared.
- **Uniqueness:** within one measurement set, the normalised _Item + Quantity + Unit_ must be unique (a duplicate row is rejected).
- **Set order:** by measurement date, then by creation order (internal set ID).
- **Differences:** later value minus earlier value; between items, each item is compared with the first item in display order.

**Comparison views** (generated automatically; no configuration):

1. **Between items** — within one measurement set, for one _Quantity_ (and one unit), all items side by side as bars with their values and the differences between them. Example: _Stone thickness_ — Left 18 · Right 15.3 · Top 20.
2. **Before vs after** — the same _Item + Quantity_ (and unit) across measurement sets, in set order, with the change between consecutive sets.

### 5.8 Photos

| Field | Greek | Type | Rules |
|---|---|---|---|
| Image | Εικόνα | image file | Required. Uploaded from desktop or directly from the phone camera (online). |
| Phase | Φάση | code (§7.15) | Required. Before / During / After. |
| Caption | Λεζάντα | text | Optional. |
| Date taken | Ημερομηνία λήψης | date-time | Read automatically from the photo's metadata when present; editable. |

The record shows photos grouped by phase. The original file is always kept unchanged; storage and access rules in §11.4.

### 5.9 Attachments

Documents and drawings (PDF, images, office documents): file + title (optional) + original filename + upload date. Any number per record. Storage and access rules in §11.4.

Attachments are added in two ways: **directly** to the record, or **through a log entry** (§5.11). The **Attachments pane lists all of the record's attachments**; those added through a log entry also show that entry's date and text (e.g. "Plans.pdf · 2026-05-01 · Architect sent plans"). Attachments of private log entries are private.

### 5.10 Verification

Recorded on exactly two transitions (§8.1): **Ready for verification → Closed** (outcome _passed_) and **Ready for verification → In progress** (outcome _failed_). No other transition creates a verification entry (e.g. a DC superseded while Ready for verification creates none). A record can have several verification entries over time (e.g. one failed, then one passed).

| Field | Greek | Type | Rules |
|---|---|---|---|
| Checked by | Ελέγχθηκε από | one entry from the people list | Required. |
| Date | Ημερομηνία | date | Required. |
| Method | Μέθοδος | code (§7.16) | Required. |
| Outcome | Αποτέλεσμα | code (§7.17) | Set by the transition: → Closed = _passed_; → In progress = _failed_. Not chosen separately. |
| Note | Σημείωση | text | Optional. |

### 5.11 Log (Ημερολόγιο)

A manual, dated record of what happened, entered by the user — e.g. "2026-05-01 · Architect sent plans", "2026-05-02 · Contractor confirmed receipt of plans". Any number of entries per record, shown newest first (by event date & time, then by logged-at).

| Field | Greek | Type | Rules |
|---|---|---|---|
| Event date & time | Ημερομηνία & ώρα γεγονότος | date-time | Required. When it happened. Defaults to now; editable. Shown in the UI. |
| Entry | Καταχώριση | long text | Required. |
| Logged by | Καταχώρισε | user | Automatic: the logged-in user. |
| Logged at | Χρόνος καταχώρισης | timestamp | Automatic: when the entry was created. **Always stored, never editable, not shown in the UI.** |
| Last edited at | Τελευταία επεξεργασία | timestamp | Automatic: when the entry was last changed; empty if never edited. Stored, not shown in the UI. |
| Attachments | Συνημμένα | zero or more files | Optional. Stored as record attachments linked to this entry (§5.9). |
| Private | Ιδιωτικό | checkbox | **P** when ticked: the entry and its attachments never appear in share links or PDFs. |

Entries can be edited and deleted by the owner. **Deleting an entry also deletes its attachment occurrences in the same transaction** (stored blobs and other occurrences of the same blob are untouched, §11.4), so deleting a private entry can never turn its attachments public. Removing an attachment from either the Log or the Attachments pane removes the same occurrence from both. The Log is separate from the automatic Activity log (§5.12), which records system changes.

### 5.12 Activity log

Automatic, append-only, per record. Logs: creation; every status change (with reason where required); changes to ball in court, responsible, severity, priority, due date, disposition, chosen option, decided by/on; every change to the instruction text (previous and new text); verification entries; share links created or revoked. Each entry: what changed, from → to, who, when. Activity entries about private fields are visible only to the owner.

## 6. Subtype-specific fields

### 6.1 Quality Issue

| Field | Greek | Type | Rules |
|---|---|---|---|
| Type of problem | Είδος προβλήματος | one or more codes (§7.5) | Required in active statuses. Several can apply at once (e.g. Defect + Nonconformance). When **Nonconformance** is ticked, the broken requirement should be written in _Reference_. |
| Stage | Στάδιο | code (§7.6) | Optional. When in the project the problem was found. |
| Disposition | Τρόπος αντιμετώπισης | code (§7.7) | Empty until decided. **Required before the status can become Issued or In progress, and for closing without verification.** _Repair_ and _Accept as is_ also require _Decided by_ and _Decided on_ (§5.6). _Accept as is_ allows closing without corrective work (§8.1). |
| Correction | Διόρθωση | long text | Optional. The work that fixes the problem. |

### 6.2 Detail Clarification

| Field | Greek | Type | Rules |
|---|---|---|---|
| Question | Ερώτημα | long text | Required in active statuses. What needs defining or agreeing, and where. |
| Route | Διαδικασία | code (§7.8) | Optional. How the clarification is handled. |
| Issued by | Εκδόθηκε από | one entry from the people list | Optional. Who issued the instruction (architect, engineer, owner…). |

The decision and instruction text use the shared fields (§5.6). Sketches and drawings are attachments (§5.9).

### 6.3 Task

No additional fields. Uses the shared structure only.

## 7. Value lists

Every value: code, English label, Greek label, English definition, Greek definition. Codes are stable; labels and definitions may be refined later without data changes.

### 7.1 Subtype (Υποκατηγορία)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `quality_issue` | Quality Issue | Ζήτημα ποιότητας | Something wrong with work that has already been built. | Πρόβλημα σε εργασία που έχει ήδη εκτελεστεί. |
| `detail_clarification` | Detail Clarification | Τεχνική διευκρίνιση | An instruction or detail agreed before something is built, to prevent problems. | Οδηγία ή λεπτομέρεια που συμφωνείται πριν από την κατασκευή, ώστε να προληφθούν προβλήματα. |
| `task` | Task | Εργασία | Any other piece of work to track. | Οποιαδήποτε άλλη εργασία προς παρακολούθηση. |

### 7.2 Status (Κατάσταση)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `draft` | Draft | Πρόχειρο | Not finished being written. Never shown in share links. | Η καταχώριση δεν έχει ολοκληρωθεί. Δεν εμφανίζεται ποτέ σε συνδέσμους κοινοποίησης. |
| `open` | Open | Ανοιχτό | Logged and complete, but nobody has yet been asked to decide or act. | Καταγράφηκε πλήρως, αλλά δεν έχει ζητηθεί ακόμη από κανέναν να αποφασίσει ή να ενεργήσει. |
| `awaiting_decision` | Awaiting decision | Αναμονή απόφασης | Someone (usually the architect) has been asked to decide what should be done. | Έχει ζητηθεί από κάποιον (συνήθως τον αρχιτέκτονα) να αποφασίσει τι πρέπει να γίνει. |
| `issued` | Issued | Εκδόθηκε | The decision is made and the instruction has gone to whoever does the work; the work has not started. | Η απόφαση πάρθηκε και η εντολή δόθηκε σε όποιον εκτελεί την εργασία· η εργασία δεν έχει ξεκινήσει. |
| `in_progress` | In progress | Σε εξέλιξη | The work has started. | Η εργασία έχει ξεκινήσει. |
| `ready_for_verification` | Ready for verification | Προς έλεγχο | Reported as done; waiting for someone to check it. | Δηλώθηκε ως ολοκληρωμένο· αναμένεται έλεγχος. |
| `on_hold` | On hold | Σε αναμονή | Paused by a decision or by circumstances. A reason is required. | Σε παύση λόγω απόφασης ή συνθηκών. Απαιτείται αιτιολογία. |
| `closed` | Closed | Κλειστό | Finished; nothing more to do. | Ολοκληρώθηκε· δεν απαιτείται άλλη ενέργεια. |
| `cancelled` | Cancelled | Ακυρώθηκε | Will not be pursued. A reason is required. | Δεν θα προχωρήσει. Απαιτείται αιτιολογία. |
| `superseded` | Superseded | Αντικαταστάθηκε | Replaced by a later clarification and kept as history. Detail Clarification only. | Αντικαταστάθηκε από μεταγενέστερη διευκρίνιση και διατηρείται ως ιστορικό. Μόνο για τεχνικές διευκρινίσεις. |

**Statuses per subtype:** Quality Issue and Task use all statuses except `superseded`. Detail Clarification uses all statuses.

### 7.3 On-hold reason (Αιτιολογία αναμονής)

A note is required with `other`; optional otherwise.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `waiting_material` | Waiting for material | Αναμονή υλικού | Needed material or equipment has not arrived. | Δεν έχει φτάσει το απαιτούμενο υλικό ή εξοπλισμός. |
| `waiting_trade` | Waiting for another trade | Αναμονή άλλης ειδικότητας | Another trade must work first. | Πρέπει πρώτα να εργαστεί άλλη ειδικότητα. |
| `waiting_information` | Waiting for information | Αναμονή πληροφοριών | Information or documents are missing. | Λείπουν πληροφορίες ή έγγραφα. |
| `deferred` | Deferred | Αναβολή | Deliberately postponed, e.g. to winter or a later stage. | Μετατέθηκε σκόπιμα, π.χ. για τον χειμώνα ή για επόμενο στάδιο. |
| `weather` | Weather | Καιρικές συνθήκες | The weather prevents the work. | Οι καιρικές συνθήκες δεν επιτρέπουν την εργασία. |
| `other` | Other | Άλλο | Any other reason, explained in the note. | Άλλος λόγος, που εξηγείται στη σημείωση. |

### 7.4 Cancellation reason (Αιτιολογία ακύρωσης)

A note is required with `replaced` (the replacing record's ID) and `other`.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `duplicate` | Duplicate | Διπλοεγγραφή | The same matter is already recorded. | Το ίδιο θέμα έχει ήδη καταχωριστεί. |
| `raised_in_error` | Raised in error | Λάθος καταχώριση | Recorded by mistake. | Καταχωρίστηκε κατά λάθος. |
| `no_longer_needed` | No longer needed | Δεν χρειάζεται πλέον | Circumstances changed; nothing needs doing. | Οι συνθήκες άλλαξαν· δεν απαιτείται ενέργεια. |
| `replaced` | Replaced by another record | Αντικαταστάθηκε από άλλη εγγραφή | Continued in another record, whose ID is written in the note. | Συνεχίζεται σε άλλη εγγραφή, ο κωδικός της οποίας σημειώνεται στη σημείωση. |
| `other` | Other | Άλλο | Any other reason, explained in the note. | Άλλος λόγος, που εξηγείται στη σημείωση. |

### 7.5 Type of problem (Είδος προβλήματος) — Quality Issue, multiple choice

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `nonconformance` | Nonconformance | Μη συμμόρφωση | Differs from an agreed requirement (drawing, specification, instruction or clarification). Write the requirement in _Reference_. | Διαφέρει από συμφωνημένη απαίτηση (σχέδιο, προδιαγραφή, εντολή ή διευκρίνιση). Η απαίτηση σημειώνεται στο πεδίο _Αναφορά_. |
| `defect` | Defect | Ελάττωμα | Faulty workmanship or material. | Κακοτεχνία ή ελαττωματικό υλικό. |
| `incomplete` | Incomplete work | Ημιτελής εργασία | Work that has not been finished. | Εργασία που δεν έχει ολοκληρωθεί. |
| `damage` | Damage | Φθορά / Ζημιά | Was fine, damaged afterwards. | Ήταν σε καλή κατάσταση και υπέστη ζημιά αργότερα. |
| `design_coordination` | Design / coordination issue | Σφάλμα μελέτης / συντονισμού | Built as drawn, but the design is wrong, incomplete, or clashes with other work. | Κατασκευάστηκε σύμφωνα με τα σχέδια, αλλά η μελέτη είναι λανθασμένη, ελλιπής ή συγκρούεται με άλλες εργασίες. |
| `other` | Other | Άλλο | None of the above. | Κανένα από τα παραπάνω. |

### 7.6 Stage (Στάδιο) — Quality Issue

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `construction` | Construction | Κατασκευή | Found while the works are still ongoing. | Εντοπίστηκε ενώ οι εργασίες βρίσκονται σε εξέλιξη. |
| `pre_handover` | Pre-handover | Προ-παράδοση | Found in the owner's own checks before the formal handover inspection ("pre-punch"). | Εντοπίστηκε σε ελέγχους του ιδιοκτήτη πριν από την επίσημη αυτοψία παράδοσης. |
| `handover` | Handover | Παράδοση | Found at the formal handover inspection (punch / snag list). | Εντοπίστηκε στην επίσημη αυτοψία παράδοσης (λίστα παρατηρήσεων). |
| `warranty` | Warranty | Περίοδος εγγύησης | Found after handover, during the defects liability period. | Εντοπίστηκε μετά την παράδοση, εντός της περιόδου εγγύησης. |

### 7.7 Disposition (Τρόπος αντιμετώπισης) — Quality Issue

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `rework` | Rework | Επανεκτέλεση | Modify the existing work until it matches what was agreed. | Τροποποίηση της υφιστάμενης εργασίας ώστε να συμφωνεί με τα συμφωνημένα. |
| `replace` | Replace | Αντικατάσταση | Remove and build again. | Αφαίρεση και εκ νέου κατασκευή. |
| `repair` | Repair | Επισκευή | Make it acceptable without fully matching what was agreed. Requires approval from the authorised decision-maker, recorded in _Decided by_ / _Decided on_. | Αποκατάσταση σε αποδεκτό επίπεδο χωρίς πλήρη συμφωνία με τα συμφωνημένα. Απαιτεί έγκριση από τον αρμόδιο, με καταγραφή του ονόματος και της ημερομηνίας απόφασης. |
| `accept_as_is` | Accept as is | Αποδοχή ως έχει | Leave it; the deviation is accepted by whoever has the authority. | Παραμένει ως έχει· η απόκλιση γίνεται αποδεκτή από τον αρμόδιο. |

### 7.8 Route (Διαδικασία) — Detail Clarification

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `rfi` | RFI | Αίτημα διευκρίνισης | The contractor asks the designer to clarify something before building. | Ο εργολάβος ζητά από τον μελετητή διευκρίνιση πριν από την κατασκευή. |
| `instruction` | Instruction | Εντολή | A detail or instruction is issued, on the issuer's own initiative or after discussion. | Εκδίδεται λεπτομέρεια ή εντολή, με πρωτοβουλία του εκδότη ή μετά από συζήτηση. |
| `submittal` | Submittal | Υποβολή προς έγκριση | The contractor submits a drawing, product or sample for approval before using it. | Ο εργολάβος υποβάλλει σχέδιο, προϊόν ή δείγμα προς έγκριση πριν από τη χρήση του. |
| `mockup` | Mock-up | Δείγμα / δοκιμαστική κατασκευή | One is built first and approved, then repeated. | Κατασκευάζεται πρώτα ένα δείγμα, εγκρίνεται και έπειτα επαναλαμβάνεται. |
| `other` | Other | Άλλο | Any other route. | Άλλη διαδικασία. |

### 7.9 Severity (Σοβαρότητα)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `critical` | Critical | Κρίσιμο | Serious safety risk, structural failure or major water ingress. | Σοβαρός κίνδυνος για την ασφάλεια, αστοχία του φέροντος οργανισμού ή εκτεταμένη εισροή νερού. |
| `major` | Major | Σημαντικό | Material impairment of function, durability or appearance. | Ουσιώδης υποβάθμιση της λειτουργίας, της ανθεκτικότητας ή της εμφάνισης. |
| `minor` | Minor | Μικρό | Local cosmetic imperfection, with no material effect on function or safety. | Τοπική αισθητική ατέλεια, χωρίς ουσιώδεις επιπτώσεις στη λειτουργία ή την ασφάλεια. |

Severity describes consequences only. Urgency belongs to _Priority_ (§7.10) and dependencies to _Must be done before_ (§4.3).

### 7.10 Priority (Προτεραιότητα) — empty means none

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `urgent` | Urgent | Επείγον | Act now: something is waiting on it today or this week. | Άμεση ενέργεια: κάτι εξαρτάται από αυτό σήμερα ή αυτή την εβδομάδα. |
| `high` | High | Υψηλή | Deal with it in the current work cycle (the next one to two weeks). | Αντιμετώπιση στον τρέχοντα κύκλο εργασιών (τις επόμενες μία έως δύο εβδομάδες). |
| `medium` | Medium | Μεσαία | Schedule normally, before the current stage ends. | Κανονικός προγραμματισμός, πριν ολοκληρωθεί το τρέχον στάδιο. |
| `low` | Low | Χαμηλή | No time pressure; whenever convenient. | Χωρίς χρονική πίεση· όποτε είναι βολικό. |

### 7.11 Person role (Ρόλος) — people list

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `owner` | Owner | Ιδιοκτήτης | The project owner. | Ο ιδιοκτήτης του έργου. |
| `owner_rep` | Owner's representative | Εκπρόσωπος ιδιοκτήτη | Acts on site or in decisions on the owner's behalf. | Ενεργεί στο έργο ή στις αποφάσεις για λογαριασμό του ιδιοκτήτη. |
| `architect` | Architect / designer | Αρχιτέκτονας / μελετητής | Designs the work and decides design questions. | Μελετά το έργο και αποφασίζει για θέματα μελέτης. |
| `engineer` | Engineer | Μηχανικός | Structural, mechanical or electrical engineer. | Στατικός, μηχανολόγος ή ηλεκτρολόγος μηχανικός. |
| `main_contractor` | Main contractor | Γενικός εργολάβος | Holds the main construction contract. | Έχει την κύρια σύμβαση κατασκευής. |
| `subcontractor` | Subcontractor | Υπεργολάβος | Carries out a specific trade or package. | Εκτελεί συγκεκριμένη ειδικότητα ή πακέτο εργασιών. |
| `supplier` | Supplier | Προμηθευτής | Supplies materials or equipment. | Προμηθεύει υλικά ή εξοπλισμό. |
| `other` | Other | Άλλος | Anyone else. | Οποιοσδήποτε άλλος. |

### 7.12 Location node kind (Είδος θέσης)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `building` | Building | Κτίριο | A building, or a group of works treated as one (e.g. "Site — shared infrastructure", "Off-site"). | Κτίριο ή ομάδα εργασιών που αντιμετωπίζεται ενιαία (π.χ. «Κοινόχρηστες υποδομές», «Εκτός έργου»). |
| `level` | Level | Επίπεδο | A floor or level (basement, ground, upper, roof, external). | Όροφος ή επίπεδο (υπόγειο, ισόγειο, όροφος, δώμα, εξωτερικός χώρος). |
| `space` | Space | Χώρος | A room or defined area within a level. | Δωμάτιο ή οριοθετημένος χώρος μέσα σε επίπεδο. |
| `other` | Other | Άλλο | Any other kind of place. | Άλλο είδος θέσης. |

### 7.13 Measurement phase (Φάση μέτρησης)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `before` | Before | Πριν | Measured before the correction or work. | Μέτρηση πριν από τη διόρθωση ή την εργασία. |
| `after` | After | Μετά | Measured after the correction or work. | Μέτρηση μετά τη διόρθωση ή την εργασία. |
| `other` | Other | Άλλο | Any other moment, e.g. an interim check. | Άλλη χρονική στιγμή, π.χ. ενδιάμεσος έλεγχος. |

### 7.14 Unit (Μονάδα)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `mm` | mm | χιλ. | Millimetre. | Χιλιοστό του μέτρου. |
| `cm` | cm | εκ. | Centimetre. | Εκατοστό του μέτρου. |
| `m` | m | μ. | Metre. | Μέτρο. |
| `m2` | m² | τ.μ. | Square metre. | Τετραγωνικό μέτρο. |
| `m3` | m³ | κ.μ. | Cubic metre. | Κυβικό μέτρο. |
| `percent` | % | % | Percentage, e.g. a slope. | Ποσοστό, π.χ. κλίση. |
| `degree` | ° | ° | Angle in degrees. | Γωνία σε μοίρες. |
| `pcs` | pcs | τεμ. | Number of pieces. | Αριθμός τεμαχίων. |

### 7.15 Photo phase (Φάση φωτογραφίας)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `before` | Before | Πριν | Shows the condition before the correction or work. | Δείχνει την κατάσταση πριν από τη διόρθωση ή την εργασία. |
| `during` | During | Κατά τη διάρκεια | Taken while the work is underway. | Λήφθηκε κατά την εκτέλεση της εργασίας. |
| `after` | After | Μετά | Shows the finished result. | Δείχνει το τελικό αποτέλεσμα. |

### 7.16 Verification method (Μέθοδος ελέγχου)

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `visual` | Visual | Οπτικός | Checked by looking at the work, on site or in photos. | Έλεγχος με επιθεώρηση της εργασίας, επί τόπου ή μέσω φωτογραφιών. |
| `measurement` | Measurement | Μέτρηση | Checked with a recorded measurement set. | Έλεγχος με καταγεγραμμένες μετρήσεις. |
| `document` | Document | Έγγραφο | Checked against a certificate, declaration or report. | Έλεγχος μέσω πιστοποιητικού, δήλωσης ή έκθεσης. |
| `test` | Test | Δοκιμή | Checked by a functional test (e.g. water, pressure, electrical). | Έλεγχος με δοκιμή λειτουργίας (π.χ. στεγανότητας, πίεσης, ηλεκτρολογική). |

### 7.17 Verification outcome (Αποτέλεσμα ελέγχου)

Set by the transition (§5.10), never chosen directly.

| Code | EN | EL | Definition (EN) | Ορισμός (EL) |
|---|---|---|---|---|
| `passed` | Passed | Επιτυχής | The check confirmed the result is acceptable. | Ο έλεγχος επιβεβαίωσε ότι το αποτέλεσμα είναι αποδεκτό. |
| `failed` | Failed | Ανεπιτυχής | The check found that further work is required. | Ο έλεγχος έδειξε ότι απαιτούνται πρόσθετες εργασίες. |

## 8. Status rules

### 8.1 Allowed transitions

| From | To | Conditions |
|---|---|---|
| Draft | Open | Required fields complete (Title; _Type of problem_ for QI; _Question_ for DC). |
| Draft | Cancelled | Reason required. Required fields may remain incomplete. |
| Open | Awaiting decision · Issued · In progress · On hold · Cancelled | Issued or In progress (QI): disposition required. |
| Open | Closed | **QI only, with disposition _Accept as is_.** **Task** (done without further tracking). |
| Awaiting decision | Issued · On hold · Cancelled | Issued (QI): disposition required. |
| Awaiting decision | Closed | **QI only, with disposition _Accept as is_.** |
| Issued | In progress · On hold · Cancelled | — |
| Issued | Closed | **DC only** (instruction issued, nothing to check). **QI only with _Accept as is_.** |
| In progress | Ready for verification · On hold · Cancelled | — |
| In progress | Closed | **Task only** (no check required). |
| Ready for verification | Closed | A verification entry is recorded (outcome _passed_). |
| Ready for verification | In progress | A verification entry is recorded (outcome _failed_). |
| On hold | (status before the hold) | Resume returns the record to the status it had when put on hold. |
| Closed | Open | Reopen; a note is required. |
| any non-terminal (DC) | Superseded | **DC only.** A note naming the replacing record is required. No verification entry is created. Required fields may remain incomplete. |
| Cancelled, Superseded | — | Terminal. |

Non-terminal = every status except Closed, Cancelled, Superseded.

### 8.2 Behaviour tied to status

- **Draft** records are never shown through share links; a share link to a record that is currently Draft shows "not available".
- **On hold** and **Cancelled** require a reason (§7.3, §7.4).
- Every transition is logged (§5.12) with the reason or verification where applicable.
- The status the record had before _On hold_ is stored so _Resume_ can restore it.
- **Required fields** apply to every save in active statuses (all except Draft, Cancelled, Superseded).
- **The server enforces every rule** in §5–§8 (required fields, allowed transitions, disposition and decision conditions, measurement uniqueness), using the shared domain schemas. The browser's checks are a convenience only; a direct API call cannot bypass them.
- **A status change is one transaction:** the new status, its reason, any verification entry and the activity entries are written together or not at all.

## 9. Managed lists (per project)

All managed lists are per project and editable by the owner. Seed data for Gennadi 822A is described in §15.

### 9.1 People list (Πρόσωπα & εταιρείες)

Fields: **code** (short, unique per project, e.g. `ARCH-MK`, `C-PB`), **name**, **company**, **role** (§7.11), **email**, **phone**, **active** flag. Used by: Ball in court, Responsible, Decided by, Issued by, Measured by, Checked by. An inactive person stays on existing records but is not offered for new selections.

### 9.2 Trades (Ειδικότητες)

Fields: **code**, **name EN**, **name EL**, **definition EN**, **definition EL**, **active** flag. Add, edit, retire (retired trades stay on existing records but are not offered for new selections).

### 9.3 Tags (Ετικέτες)

Fields: **name EL**, **name EN**. At least one name is required. Names are **unique within each language** after trimming and ignoring letter case — and, because Greek capitals drop their accents, ignoring accents and final sigma too («ΠΕΤΡΑ» = «Πέτρα»).

Operations:

- **Add** — from the tag management screen, or by typing a new tag on a record (the box suggests existing tags first).
- **Rename** — applies to every record carrying the tag.
- **Merge** — if a rename collides with exactly one existing tag (in either language), the owner is offered a merge into that existing tag, which keeps its own names. If the new names collide with two different tags, the rename is rejected.
- **Delete** — removes the tag from every record (after confirmation showing how many records are affected).

A tag owns nothing: no shared documents, status or responsibility. Filtering by tag gives the list of records and counts of open vs closed.

### 9.4 Location tree (Θέσεις)

A tree per project. Each node: **name EN**, **name EL**, **kind** (§7.12), **zone type** (optional, §9.5), **sort order**, parent, **active** flag.

Operations:

- Add, rename, move, delete (delete only if no record uses the node or its descendants; otherwise retire: the node stays on existing records but is not offered for new selections).
- **Copy branch** — duplicate a node with all its descendants under a new name (e.g. build "Villa 1" once, copy to "Villa 2" and "Villa 3").
- **Picker** — a tree with checkboxes, usable on a phone, with search by name; the record shows the selected nodes as paths (e.g. "Villa 2 › Ground › Kitchen").

Selection and filtering rules: §5.5.

### 9.5 Zone types (Τύποι χώρων)

A short per-project list of space types (name EN/EL), e.g. Kitchen, Bedroom, Bathroom. A node may carry one. **Filtering by zone type** returns records located on any node of that type (e.g. "all kitchens across villas").

## 10. Screens

Mobile-first responsive layout; every screen works on a phone. Language switch available everywhere.

1. **Login.**
2. **Record list** — the home screen.
   - Filters: subtype, status, location (tree; includes descendants), zone type, trade, tag, ball in court, responsible, severity, priority, stage, type of problem, safety implications, outside contract scope (owner only), "must be done before / requires first", due date range, text search (title, description, ID).
   - Sort: ID, due date, priority, severity, updated.
   - Columns/cards: ID, title, subtype, status, ball in court, due date, priority, severity, completion bar, safety badge.
   - Totals: count; sum of estimated cost for the filtered set, counting only records currently marked _Outside contract scope_ (owner only).
3. **New record** — quick capture: subtype, title, optional photo(s) and location; saved as **Draft**; completed later.
4. **Record page** — header (ID, title, subtype, status with allowed actions, ball in court, due date, severity, priority, completion bar, safety badge) and sections/tabs:
   - **Overview** — description, location paths, responsible, trades, tags, reference, must be done before / requires first; Notes field and private commercial fields (owner only).
   - **Classification** — subtype-specific fields (§6).
   - **Decision** — options considered, chosen option, decided by/on, instruction text (QI, DC).
   - **Measurements** — sets and rows; comparison views.
   - **Photos** — grouped by phase; full-screen viewer.
   - **Attachments.**
   - **Verification** — entries.
   - **Log** — dated entries with attachments; private marker.
   - **Activity.**
   - **Share & print** — create, copy and revoke share links; open the A3 print/PDF view.
5. **Status change dialog** — shows only allowed transitions (§8.1) and asks for what each requires (reason, verification, disposition).
6. **Lists management** — people, trades, tags, location tree (with copy branch), zone types.
7. **Shared record view** (no login) — read-only record page without private content, language switch, "not available" for revoked/expired/draft. _Must be done before / Requires first_ entries show only the other record's ID and title, omit Draft records, and are not links (§11.5).
8. **A3 print view** (§12).

## 11. Architecture and operations

### 11.1 Stack

React/Vite (browser) → Fastify/TypeScript (API + serving the built web app) → SQLite. See ADR 0001. No Python, no PostgreSQL, no offline mode in v1.

### 11.2 Code layout

| Folder | Contents |
|---|---|
| `src/domain` | Pure TypeScript, no I/O: Zod schemas, value lists (codes, labels, definitions in EN/EL), status transition rules, measurement comparison logic, ID formatting. Used by server and browser. |
| `src/server` | Fastify: API under `/api`, authentication, share links, data access (SQLite, hand-written SQL migrations), file storage, PDF. Serves the built web app. |
| `src/web` | React: screens in §10. |
| `scripts/` | Seed import, backup, deploy. |
| `tests/` | Unit, API and browser tests. |

All database access is confined to `src/server` data-access modules, so a later database change stays contained. No abstraction layer is built for that purpose.

### 11.3 Data

- **SQLite** in every environment: a local file for development/testing; a separate file in production holding the real data.
- **Fixed value lists live in code** (`src/domain`), not in database tables; records store codes.
- **Managed lists** (people, trades, tags, location nodes, zone types) live in tables.
- **Multi-value references to managed lists** (trades, tags, locations, must-be-done-before) use join tables. **Multi-value fixed codes** (type of problem) are stored as a validated list of codes on the record.
- Migrations run at application start, after an automatic backup of the database file.
- **Stored files are never deleted in v1.** Removing a photo or attachment from a record removes the record's reference, not the file. Every database backup therefore always has its files.

### 11.4 Files

- **Stored file (blob):** the bytes, stored once in the data folder and identified by their **SHA-256 content hash**, with size and content type.
- **Occurrence:** each photo or attachment on a record is its own row, holding the record, the blob reference, the original filename, title/caption, uploaded by/at and — for attachments added through the Log — the log entry. The same file uploaded to two records gives two occurrences sharing one blob.
- **Photos** reference three blobs: original, display copy and thumbnail. The browser produces the display copy and thumbnail at upload, so the server needs no image-processing module.
- **Originals are never modified or overwritten.** Corrections add new files.
- **Access:** files are served only through an authorised application route, addressed by **occurrence**, never by blob. The owner's session can fetch any occurrence. A share-token request must name a **non-private occurrence belonging to the linked record** (not attached to a private log entry); authorisation and the returned metadata (filename, title, log entry) come from that occurrence only. A private occurrence stays inaccessible even if another, public occurrence references the same blob. This applies to originals, display copies and thumbnails. Knowing a content hash grants no access.
- Limits: photos up to 25 MB, attachments up to 50 MB. Accepted: images (JPEG, PNG, HEIC), PDF, common office documents.

### 11.5 Authentication and sharing

**Owner login**

- Username + password; password hashed with Node's built-in `scrypt`; login rate-limited; HTTPS only.
- The owner account is **created and its password reset by a server-side command** (no sign-up or reset screen). **A password reset deletes all sessions.**
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, **host-only** (no `Domain` attribute, so it is never sent to `ktimanet.com` or other subdomains).
- The session identifier is a random token; the server stores only its **SHA-256 hash**, so a database or backup never contains a usable session. Sessions expire **30 days after login** (absolute) and are deleted on logout.
- **Forged-request protection** (`SameSite` alone is not relied on, because `ktimanet.com` (WordPress) counts as the same site). Every request below must carry an `Origin` header equal to the configured public base URL (`https://builtbasis.ktimanet.com` in production):
  - **Login:** valid credentials, matching `Origin`, JSON body.
  - **Owner data changes:** valid session, matching `Origin`, JSON body.
  - **File uploads:** valid session, matching `Origin`, multipart form body.
- **Reads:** GET requests never modify records, evidence or access permissions (including share links). The only exception: a successful, authorised share-page read updates that link's view count and last-viewed time.

**Share links**

- One record per link. Token = 32 random bytes, URL-safe. Each token is stored in two forms:
  - a **SHA-256 hash**, used to validate incoming links;
  - an **encrypted copy** (AES-256-GCM, a fresh nonce for every encryption, nonce and authentication tag stored with the ciphertext), so the owner can copy and resend a link at any time and the QR code can reuse it.
- The **share-link encryption key** is dedicated to this purpose and kept in the server configuration — **outside the database, the repository and the backups**. Deployment preserves it. If it is lost or replaced, all existing links are revoked and new ones issued.
- Raw tokens appear only in owner-authorised link management and in the chosen PDF QR code. They are **never written to activity entries or logs**.
- Database backups therefore contain neither usable share links nor usable sessions. They still contain the record data itself and must be protected accordingly.
- Each link: label (whom it is for), created at, optional expiry, revoked at, last viewed at and view count. Revoked or expired links, and links to a Draft record, show "not available". Share pages are marked `noindex`.
- **Private content (§2) is excluded by the server**, not merely hidden in the browser.
- A share token grants access to its record's page and that record's files (§11.4), nothing else. _Must be done before / Requires first_ entries on a shared page show only the other record's ID and title, omit Draft records, and grant no access to them.

### 11.6 Hosting

- Hetzner Webhosting L, addon domain **`builtbasis.ktimanet.com`**, Node.js enabled for that domain only. `ktimanet.com` and its WordPress installation are untouched.
- **Served through Cloudflare** (DNS for ktimanet.com is on Cloudflare): the `builtbasis` records are proxied, SSL/TLS mode Full (strict); the edge uses Cloudflare's Universal certificate and Hetzner serves the Cloudflare Origin Certificate for `*.ktimanet.com`. The server takes the visitor IP from `CF-Connecting-IP` when `BEHIND_CLOUDFLARE=1` (login rate limiting, logs). The application cannot check that a request really came through Cloudflare — Hetzner's web server is its direct peer — so the login limiter also caps failed logins globally. Restricting the origin to Cloudflare's address ranges is decided in Plan 6.
- **How the app listens:** `server.listen()` without arguments; Hetzner supplies a Unix socket and starts the app on demand (trial, §11.9). Locally a `PORT` is used.
- **Dependencies:** the server has no C++ compiler, and npm runs install scripts only for packages listed in `allowScripts`. Use only dependencies that ship prebuilt binaries or need no build step (better-sqlite3 13 does).
- Directory layout on the server:
  - **Application folder** — replaced on every deployment.
  - **Data folder** (separate path, outside the application folder) — `builtbasis.db`, `files/`, `backups/`. **Never touched by deployment.** Its path is given by an environment variable.
- Configuration via environment variables (data path, public base URL, share-link encryption key, Node environment). Configuration is kept outside the application and data folders and is preserved across deployments; the encryption key is never stored in the database, repository or backups.
- **Deployment:** build locally → upload the application folder over SSH (rsync, available on the server) → install production dependencies on the server (`npm ci --omit=dev`) → **restart by stopping the running Node process**; the platform starts the new version on the next request (≈ 1.3 s cold start) → migrations run on start after a pre-migration backup.

### 11.7 Backups

- **On the server (nightly, cron):** consistent database copy using SQLite's own backup mechanism (`VACUUM INTO`), never a plain copy of the live file. The copy is written under a **temporary name**, checked with `PRAGMA integrity_check`, and only then renamed to its final name, so an interrupted or damaged backup never looks complete. Rotation: 14 daily + 8 weekly copies in `backups/`.
- **Off the server (nightly):** a Windows scheduled task on the owner's PC pulls over SSH to the X: drive in this order:
  1. **Select and pin one completed database backup** and copy it.
  2. **Copy the files.** Files are content-addressed, immutable and never deleted (§11.3), so every file the pinned backup references still exists on the server; only new files are copied.
  3. **Verify** that every file referenced by the pinned backup is present locally; only then mark that off-site copy complete.
- **Restore requirements** (the operator guide, written at delivery, must satisfy them): stop the application and backup jobs first; restore a database together with its files; use application code compatible with that database's schema; **before access resumes, delete all sessions and revoke all share links** (a restored database can bring back links revoked after the backup was taken); then issue new links where needed.
- **One restore drill** from an off-site copy is performed before v1 is declared delivered.

### 11.8 PDF

- **v1: the owner prints the A3 print view to PDF from the desktop browser** (the print view has an A3-landscape print layout). The trial showed Chromium cannot run on Webhosting L (missing system libraries, no root), so no server-side PDF is built. Revisit when hosting moves to a VPS.

### 11.9 Test deployment (before implementation is committed)

A half-day trial on Webhosting L must confirm:

1. Node.js activates on `builtbasis.ktimanet.com` while `ktimanet.com` (WordPress) keeps working.
2. SQLite works on the server: `better-sqlite3` installs and runs, or — as the fallback — Node's built-in `node:sqlite` (Node 24) does. The result fixes the driver used by the implementation.
3. **The data folder is on local disk, not a network filesystem.** SQLite is reliable only where file locking and durability are reliable; switching WAL off does not make network storage safe. If the data folder cannot be placed on local disk, **production does not go live on Webhosting L** and the owner decides on alternative hosting (e.g. a Hetzner Cloud server).
4. How the application is restarted after deployment (konsoleH).
5. The maximum memory limit for the Node process.
6. Whether Playwright/Chromium runs (§11.8).
7. Whether cron can run `node` (backups).

**Trial completed 2026-10-03 — result: GO** (checks 1, 2, 3, 4, 7 pass; 6 fails → browser print; memory limit 384 MB). Evidence: `spikes/webhosting-l/README.md`.

**Sequencing:** server implementation (roadmap Plan 2 onward) starts only after a go result. Exception: Plan 1 — pure domain code with no hosting dependency — may be implemented before the trial.

## 12. A3 print view and PDF

One A3-landscape page per record (continuing to further pages if needed), in the chosen language, **without private content**. It shows exactly these fields:

- Header: ID, title, subtype, status, severity, priority, due date, ball in court, responsible.
- Location paths; trades; tags; reference.
- Description (QI, Task); question (DC).
- Classification (subtype fields).
- Decision: chosen option, decided by/on; current instruction text.
- Measurements: for each phase present, the latest set (by set order, §5.7) as a table, plus the comparison views.
- Photos: up to 4 _Before_ and 4 _After_ (most recent first).
- Verification entries.
- **QR code** to an existing active, non-expired share link of the record, chosen by the owner. If the record has none, the print view offers a button to create one first (an explicit action, §11.5).
- Footer: generated date-time, record last-updated date-time.

The Notes field, the Log and the Activity log are not printed.

## 13. Tests

- **Domain (Vitest):** status transitions and their conditions (§8); required fields per status, including Draft/Cancelled/Superseded exceptions; disposition and decision conditions; measurement comparison, label matching, uniqueness, set order and differences (§5.7); ID formatting; **every fixed-code list in §7 (including verification outcome) has an EN label, EL label, EN definition and EL definition for every value** (completeness test over all fixed-code lists, not a hand-picked subset).
- **API (Vitest + Fastify `inject`, temporary SQLite file):**
  - CRUD for records and managed lists; tag rename/merge/delete across records, including the two-tag collision rejection; location filter includes descendants and counts once; must-be-done-before cycle rejection.
  - **Security:** owner data changes and uploads without a valid session are rejected, while a valid login succeeds without an existing session; login, data changes and uploads with a wrong or missing `Origin` are rejected; GET requests change no records, evidence or access (only the share-page view count and last-viewed time); invalid direct API writes (rule violations) are rejected by the server; a password reset ends all sessions; session identifiers and share tokens are never stored in plain text, and raw share tokens never appear in activity entries or logs.
  - **Log and attachments:** attachments added through a log entry appear in the record's attachments list with the entry's date and text; directly added attachments appear without one.
  - **Sharing:** private fields (including the Notes field and private log entries) absent from share responses; attachments of private log entries cannot be fetched with a share token; **same blob, two occurrences:** with one public and one private occurrence of the same file on the shared record, the public one downloads and the private one is denied, and no private filename or log metadata is returned; **deleting a private log entry** deletes its attachment occurrences and never makes them public; Draft records not available; revoked and expired tokens rejected for pages **and files**; a token for one record cannot fetch another record's files; must-be-done-before entries on shared pages omit Draft records and expose only ID and title.
  - **Atomicity:** a failed status change leaves status, verification and activity unchanged.
- **Browser (Playwright):** login; quick capture on a phone-sized viewport; status changes with reasons/verification; measurements and comparison views; share link view (no private content); language switch; A3 print view contains no private content.
- **Recovery drill:** one restore from an off-site copy (database + files) before delivery (§11.7), including session deletion and share-link revocation.

## 14. Out of scope for v1

- Links between records other than _Must be done before_.
- A structure or taxonomy of physical elements.
- Accounts for anyone other than the owner; others editing, acknowledging or uploading.
- Notifications (email, messaging).
- Pins on drawings; drawing viewer.
- Offline mode; native apps.
- AI and Python services; PostgreSQL.
- Commercial workflow beyond §5.4 (who pays, back-charges, quote lines).
- Function/System classification, procurement categories, procurement milestones.
- MS Project integration.
- Inspections, checklists, inspection & test plans.
- Deleting records: a record created by mistake is cancelled (reason _Raised in error_).
- Edit-conflict detection: when the same record is saved from two devices, the last save wins.

## 15. Seed data for Gennadi 822A

Loaded by a seed script; contact details are loaded into the database only and are **not** stored in this repository.

| List | Source | Notes |
|---|---|---|
| People | `X:\CBG\Prj\Internal projects\cbg2401 - Κατασκευή Γεννάδι 822Α\Παρακολούθηση Έργου\Γεννάδι 822Α - Εκκρεμότητες v3-References.csv` (Owner/Initials/Full name/Email/Phone) | Role mapped from the code prefix: `ARCH` → architect; `C-PB` → main contractor; other `C-` → subcontractor; `SUP` → supplier; `O3P` → other. Owner and owner's representatives are set manually. |
| Trades | `X:\CBG\Prj\Internal projects\cbg2401 - Κατασκευή Γεννάδι 822Α\Project Tracking\Project Fields Lookups.xlsx`, sheet _Trades_ | 34 trades with EN/EL names and definitions, imported verbatim except LVS, whose Greek name becomes «Ασθενή ρεύματα» (list below). |
| Location tree | Same workbook, sheets _Location_ and _Zone_ | Top level: Villa 1, Villa 2, Villa 3, Site (shared infrastructure), Off-site (supplier fabrication). Each villa: levels Basement, Ground, Upper, Roof, External with the spaces of the _Zone_ sheet; built once and copied. "All villas" = tick Villa 1, Villa 2 and Villa 3. (Ticking the project root means the whole project, including Site and Off-site.) |
| Zone types | Derived from the _Zone_ sheet | Living area, Kitchen, Bedroom, Bathroom, Hall, Stairs, Machine / store room, Balcony, Pergola, Terrace, Pool area, Garden, Entrance (EN/EL). |
| Tags | Thematic groups in the References CSV | 25 groups (below), Greek names as source except where improved, English names added. |

**Trades** (code · EN · EL): BMS Automation Αυτοματισμοί · CAR Carpentry Ξυλουργικά · CLD Cladding Επένδυση · CON Concrete Σκυροδέτηση · DEM Demolition Κατεδαφίσεις · EAR Earthworks Χωματουργικά · ELE Electrical Ηλεκτρικά · EXS External Structures Εξωτ.Κατασκ. · FEN Fencing Περίφραξη · FIR Fire Πυρασφάλεια · FLR Resilient Flooring Ελαστικά Δάπεδα · FRG Frames-Glazing Κουφώματα · FRM Formwork Καλούπια · GYP Gypsum Γυψοσανίδες · HVC HVAC Κλιματισμός · INS Insulation Θερμομόνωση · LAN Landscaping Φύτευση · LFT Lifts Ανελκυστήρες · LGT Lighting Φωτισμός · LVS Low Voltage Ασθενή ρεύματα · MAS Masonry Τοιχοποιία · MET Metalwork Μεταλλικά · PAI Painting Βαφές · PAV Paving Δάπεδα · PLR Plastering-Rendering Σοβατίσματα · PLU Plumbing Υδραυλικά · POL Pool Πισίνα · REB Rebar Οπλισμοί · ROF Roofing Στέγη · SCR Screeds Τσιμεντοκονίες · SUR Surveying Τοπογραφικά · TIL Tiling Πλακίδια · UTL Utilities Υποδομές · WPR Waterproofing Στεγάνωση.

**Tags** (EL · EN): Πλακάκια - Μάρμαρα · Tiles - Marble | Φωτιστικά Σώματα · Light fittings | Είδη Υγιεινής · Sanitaryware | Ηλεκτρικές Συσκευές · Electrical appliances | Λοιπός Κινητός Εξοπλισμός · Other movable equipment | Internet - Συναγερμός · Internet - Alarm | Ξυλουργικά - Πάγκοι · Carpentry - Worktops | Υδραυλικά · Plumbing | Ηλεκτρολογικά · Electrical | Κλιματισμός A/C · Air conditioning | Μόνωση - Στεγάνωση · Insulation - Waterproofing | Πέτρα · Stone | Λοιπά Κατασκευαστικά · Other construction | Σκάλα · Stairs | Κουφώματα · Windows and doors | Γυάλινα Στηθαία · Glass balustrades | Πισίνα · Pool | Πέργκολες · Pergolas | Περίφραξη · Fencing | Ντεκ Πισίνας · Pool deck | Διαμόρφωση περιβάλλοντος χώρου · Landscaping | Λοιπός Εξωτερικός Χώρος · Other external areas | Γκαραζόπορτα · Garage door | Τελικές εργασίες και έλεγχοι · Fit-out and checks | Διαχείριση · Management.

## 16. Open items for the implementation plan

These do not change the design; they are settled during planning or the test deployment.

1. **Importing existing records** (the tracker spreadsheet rows; the 2026-09-14 measurement workbook): whether and how, given that records are entered manually otherwise. Seed lists (§15) are in scope.
2. **HEIC photos from iPhones:** confirm whether the browser upload delivers JPEG; otherwise convert in the browser.
3. ~~Restart mechanism and memory limit~~ — **resolved by the trial:** restart = stop the Node process (restarts on the next request); memory limit 384 MB, app ≈ 78 MB (§11.6, §11.9).
4. ~~PDF path~~ — **resolved by the trial:** browser print (§11.8).
5. **Presentation of definitions** — inline help, tap or hover (§3).
6. **Screen layouts** — wireframes before building the record page and list.
