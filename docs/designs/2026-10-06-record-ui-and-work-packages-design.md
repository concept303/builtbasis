# Record interface and work packages

> **Document type:** Design · **Status:** Draft for review · **Date:** 2026-10-06
> **Scope:** Consolidated record-interface changes and project work packages, including the proposed database migration.
> **Approval boundary:** The owner agreed the UI direction and work-package concept, and accepted all six iteration 7 decisions and the 76-row wording list. This single consolidated document is submitted for review before implementation planning. No application changes are authorised by this document alone.
> **Consolidation:** Incorporates the base design and iteration 7 amendment as of 2026-10-06. Read this document on its own; the earlier amendment is superseded and retained for provenance.

**Implementation plan:** [Task sequence and verification](../plans/2026-10-06-record-ui-and-work-packages-plan.md) — draft, not executed.

## 1. Purpose and baseline

Make everyday record work easier to read and edit. Add a named grouping for a related body of work within a construction project. Preserve existing capabilities while reducing visual clutter. Prefer improvements informed by actual use over additional blueprint rounds.

The implemented database baseline is migrations 0001–0006. The [data model](../reference/data-model.md) distinguishes that baseline from the proposed extension. The [v1 specification](../specs/v1.md) continues to govern existing behaviour except for the explicitly proposed changes below.

The [iteration 7 blueprint](2026-10-06-ui-batch-7.html) is the current visual reference. It is a standalone sample, not application code. The [blue colour preview](2026-10-06-ui-blue-colours.html) and earlier iterations remain comparison references. The written requirements below govern where a blueprint simplifies or omits behaviour.

### Implementation starting point and blueprint limits

**Starting point.** The application does not yet implement this design. Checked on 2026-10-06 at commit `6b56f4f`:

- The record page still has six tabs, including Activity and Sharing ([RecordPage.tsx](../../src/web/record/RecordPage.tsx)).
- [styles.css](../../src/web/styles.css) still uses the teal palette with an amber focus ring.
- The record list shows raw ISO due dates ([RecordList.tsx](../../src/web/home/RecordList.tsx)).
- There is no work-package code or migration.

Implement the record-interface foundation (§3), package rules (§4–§6), detailed screen requirements (§7) and approved wording (§8) together.

**Read in this order:** this consolidated document, then the iteration 7 blueprint.

**Using the blueprint.** Open the HTML file in a browser.

- **What changed in iteration 7?** lists every change, each with a **Show** button that opens it.
- **Blueprint controls, colours and sample states** has switches for:
  - agreed versus adjusted colours;
  - owner versus contributor or shared reader (this changes how the record header shows the package);
  - an empty package list.

Use the blueprint for layout, wording, states and interaction, but do not port its code. It layers scripts on earlier previews and uses sample data with "today" fixed at 6 October 2026.

**Blueprint behaviour that does not apply to the application:**

| Blueprint | Application |
|---|---|
| Phone layout below 700 px | Use the existing 650 px breakpoint |
| Navigation uses buttons and in-page views | Keep real links and routes (§A1) |
| Dates written as "7 October 2026" | Use the existing `dateText` helper (`7 Oct 2026` / `7 Οκτ 2026`) |
| Records filter applies on change | Keep the existing **Apply** button |
| Overview grid repacks values visually (`dense`) | Render values in the DOM order of §J2; do not reorder visually |
| `window.confirm`, `alert`, `prompt` | Existing dialogs and `useDirtyGuard` |
| "New record" shows a notice | Opens the real capture form with the package preselected |
| Change map, blueprint controls, colour switch, contrast table, sample data, "Opens in this blueprint" tag, location sketch | Never shipped (§3) |

## 2. Agreed direction and draft defaults

### Agreed with the owner

- A construction project contains work packages. A package belongs to exactly one project.
- A work package contains records of any of the three subtypes. Each record belongs to at most one package and may remain ungrouped.
- Package attributes are Name, Description, Responsible person, Target date and Status. Name and Status are required. The initial status is Planned.
- Package statuses are Planned, In progress, On hold, Completed and Cancelled.
- Totals are calculated from records. There is no manually maintained package completion percentage.
- A package does not replace trades, tags or locations. There is no package nesting.
- Record status, responsibility and due date remain independent of their package.
- Use the agreed progressive interface changes, with blue accents and neutral surfaces. Do not add another broad redesign.

### Proposed implementation defaults

These rules are part of the draft submitted for technical review. The six specifically accepted owner decisions are recorded in §10:

- Package management is owner-only. A reader may see the package name on an accessible record, but gains no access to the package or its other records.
- Delete package always opens a dialog. An empty package may be deleted. A populated package shows an explanation and must first have its records reassigned or ungrouped. Deleting a package never deletes its records.
- Package status is manually chosen. Any package status can change to any other. Completing or cancelling a package with outstanding records asks for confirmation showing their count; it does not change the records.
- Package names are free text, unique within their project after the existing case/accent/whitespace normalization. This avoids indistinguishable choices. Names are not automatically translated.
- Existing records start ungrouped. No packages are inferred from tags or trades.
- No automatic inheritance of package responsible person or target date when creating a record.
- Package target-date warnings and record overdue warnings use the calendar date in Europe/Athens, as accepted by the owner. No separate timezone setting is introduced.

## 3. Record interface

### Reading and navigation

The identity line contains human ID, subtype and status above the title. Keep a short next-action strip with Next action by, Responsible and Due date. Show a safety warning only when flagged. Omit empty optional values from the reading view; retain them in the editor.

Use four main sections: Overview, Photos & files, Measurements and Log. Desktop uses tabs. Phone uses a section selector. Sharing and Activity history open in panels from header actions. Their existing information and permissions remain available. Print stays accessible through Sharing, including print without QR.

The record's package appears in the identity line after ID, subtype and status when assigned (§H). It does not occupy a separate line below the title. For the owner it opens the package. For contributors and shared readers it is plain text. It must not include counts, responsible person, target date, description or links to sibling records.

### Editing and field coverage

| Group or action | Fields and capabilities |
|---|---|
| Work | Title, Description, Work package, Severity, Completion, Safety implications. |
| QI Work fields | Type of problem and Stage. |
| DC Work fields | Question. |
| Decision and instruction, QI/DC only | Options considered, Chosen option, Decided by/on, exact Instruction text; QI Disposition and Correction; DC Route and Issued by. |
| People and timing | Next action by, Responsible, Due date, Priority. |
| Location | Existing multi-select location tree, Location Notes and independent location photos. |
| Trades and tags | Searchable multi-selects with selected chips; retain tag creation. |
| References, sequence and notes | Reference, Must be done before, Public Notes. |
| Private, owner only | Private Notes, Outside contract scope, Estimated cost. |
| Photos & files | Existing evidence photos, attachments, metadata, upload, protected viewing and original download. |
| Measurements | Full existing sets, multiple rows, ordering, editing, deletion and comparison. |
| Log | Existing entry text, event time, privacy, attachments, authorship and permitted actions. |
| Change status | Existing subtype-specific transitions, reasons, verification and reopening notes. |
| Overview: Verification history | Compact collapsible block with every check’s date, checker, method, outcome and full note; retained separately from Activity history. |
| Overview: Sequence and dates | Read-only Must be done before and Requires first together, followed by Created and Updated. Requires first is the reverse relationship, not another editable field. |
| Sharing and Activity history | Existing links, grants, print and change history. |

The editor hides duplicate reading content and has a persistent Save/Cancel bar. Opening Measurements or Log from the editor must preserve the record draft. Saving an entry or upload is a separate operation; cancelling the record form does not undo those operations. Explain this at the operation, not with a permanent wall of instructions.

Optional References and Private sections may collapse, with summaries indicating populated content. Severity and Completion stay in Work. The full measurement and Log editors must be preserved; the simplified blueprint forms do not replace their capabilities.

### Controls and colours

- Use blue #315dc8 for primary buttons, links and active navigation. Use white cards, neutral grey borders/backgrounds and dark text. Avoid tinted backgrounds across every section.
- Status badges use neutral grey for Draft/Cancelled/Superseded, blue for Open/Issued/In progress, amber for Awaiting decision/On hold, plum for Ready for verification, and green for Closed. Always retain text. These colours are an interface mapping, not database attributes.
- Definitions use the agreed small dotted-circle info icon aligned with its label or value. Hover, focus and click/tap reveal the same content. Escape and outside interaction dismiss it. Touch targets remain larger than the visible icon.
- Trades/tags selectors close on Escape, outside click and focus leaving the control, including the blank area beside their trigger. Preserve selected values and sensible focus return.
- Use the same plus, pencil and bin controls for location photos, Log entries and measurement sets. Every icon has an accessible action name and a hover/focus label. Comparison keeps a text label.
- Location photos have one Add control directly after the gallery heading. Each image has caption editing and deletion. Accept multiple images; show pending upload and failure states. Do not make users expand a separate Add photos section.
- A keyboard user must be able to reach and operate every control. Dialogs retain focus, close with Escape when safe and return focus to the opener. Phone layout must avoid page-level horizontal scrolling.
- Blueprint testing controls and colour samples are never shipped in the application.

### Status changes and record deletion

The dialog offers the actual allowed next statuses, not an unrestricted list. Reasons, reopening notes and verification fields appear only when applicable. Required field errors explain how to resolve them without discarding entered information. Keep a collapsible full status catalogue for context. Preserve all existing server rules.

Add owner-only permanent record deletion as proposed in iteration 6. Confirmation names the record and requires its human ID. Show the impact on evidence, Log, measurements, history, grants and share links. Cancelled remains the history-preserving alternative where available.

Before deletion, check references from other records through Must be done before. Block deletion while any such relationship exists and identify the affected records to the owner. Recheck under the same short write transaction used for deletion. Remove outgoing and incoming precedence links only after that condition has been satisfied. Explicitly delete photo/attachment occurrences and share links, then record-owned rows in a foreign-key-safe order. Retain immutable blobs and counters; never reuse the record's identity. Losing the record also ends its grants and public access. Race tests must cover another reference or upload arriving during deletion.

## 4. Work-package forms and navigation

### Project package list

Add owner-only Work packages to project navigation immediately after Records. Use real list/detail routes as specified in §A. A compact list shows Name, Status, Responsible person, Target date and Outstanding/Total record counts. Provide New work package and a name search. Use compact cards on narrow screens. Empty state explains the purpose in one sentence and offers creation.

A package detail view shows its description, responsible person, target date and status, followed by its records. Provide Edit package and New record. Creating a record from here preselects the package, without changing the existing record-creation rules. Package records use the existing record list and filters rather than a second record-list implementation.

Display totals by subtype and record status. Outstanding means every record except Closed, Cancelled and Superseded; Draft therefore counts as outstanding. Overdue means an outstanding record with due date before today. Calculate totals from the database when requested; do not persist counters. An empty package shows zero values.

The global project Records view gains a visible Work package filter with “All records, with or without a package”, “Ungrouped · no work package”, and individual package choices (§G). Package status does not hide records from the Records view.

### Package form

| Field | Control and validation |
|---|---|
| Name | Single-line text, required, trimmed, maximum 200 characters. Unique normalized name within project. |
| Description | Multiline text, optional, maximum 10,000 characters. |
| Responsible person | Optional existing project-person selector. Preserve an assigned retired person for display; do not offer retired people for new assignments. |
| Target date | Optional date control, same date representation as record due dates. |
| Status | Required fixed-value selector, default Planned. |

Use one form for create and edit. Creation is a separate save; cancelling the record editor does not delete a package created from it. The inline New work package action preserves the record draft and preselects the newly created package. Show errors without clearing either form. Package edits must not silently overwrite an unsaved record draft.

### Record assignment

Add an optional searchable single-select Work package field in Work. The empty choice reads No work package. Selecting or clearing a package takes effect only when the record is saved. Show package name and status in choices. Completed and Cancelled packages remain selectable with their status visible; selecting one does not reopen it.

Assignment and reassignment do not change record subtype, status, due date, responsible person, grants or share links. Log changes in the record's existing Activity history. Preserve enough old/new package-name context to explain historical changes after an empty package has been deleted. No package-level activity subsystem is introduced in this release.

### Package lifecycle

Renaming a package changes its current display name wherever resolved. Deleting an empty package requires explicit confirmation of its name. A populated package returns a conflict with its record count; the owner must reassign or ungroup those records first. Existing records are never cascade-deleted by package deletion.

Project deletion remains the existing explicit destructive operation. Include package counts in its usage preview. Delete records before packages, and packages before referenced people. Keep all work in the existing project deletion transaction.

## 5. Model and database migration

### Conceptual change

Project 1:N Work package; Work package 1:N Record. Each package belongs to exactly one project. Each record retains exactly one project and may have zero or one package. Both record and package must be in the same project. Existing direct Project-to-Record ownership remains.

### Proposed relational change

Create work_packages with id, project_id, name, name_key, description, responsible_id, target_date, status, created_at and updated_at. Add nullable records.work_package_id. No linking table is needed because package membership is not N:N.

Use an integer AUTOINCREMENT package ID so a deleted package's URL cannot later identify a different package. Apply the existing text-normalization helper to name_key and enforce uniqueness on (project_id, name_key). Record cross-project assignments and package-person mismatches are rejected by the server inside the write transaction, following existing managed-list validation patterns.

Proposed migration shape, to be finalized and replayed during implementation planning:

```sql
CREATE TABLE work_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  name_key TEXT NOT NULL,
  description TEXT,
  responsible_id INTEGER REFERENCES people(id),
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK(status IN ('planned','in_progress','on_hold','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name_key)
);
ALTER TABLE records ADD COLUMN work_package_id INTEGER REFERENCES work_packages(id);
CREATE INDEX records_project_package ON records(project_id, work_package_id);
CREATE INDEX work_packages_responsible ON work_packages(responsible_id);
```

The package FK intentionally does not cascade or clear assignments on deletion. Migration 0007 must leave every existing record unchanged except for a NULL work_package_id. Use the existing backup-before-migration procedure. Review backup compatibility checks, offsite export, isolated restore and the recovery checklist for the new migration level. Restoring a post-migration database requires code that understands it; switching to an old release alone is not a database rollback.

## 6. Server contracts, access and integration

Use owner-only project-scoped endpoints for package list/detail/create/update/delete, under /api/projects/:projectId/work-packages. Delete includes typed name confirmation. A missing or wrong-project package returns not found; a populated package or duplicate name returns conflict; invalid fields return validation errors. Existing authentication, Origin checks, logging rules and error conventions apply.

Extend record creation/update/detail/list schemas with nullable workPackageId. Validate the selected package again when saving. The package filter must distinguish no filter from an explicit ungrouped filter. A package detail request and its record list must remain scoped to the current project.

Contributor and anonymous projections may include only the current package name as contextual text. They receive no package ID, description, counts, people or sibling links. Package endpoints remain owner-only. Add the package name to the strict print projection if assigned. Always resolve it in the fresh printable snapshot; renaming a package does not require touching all member records. Existing protection against stale print snapshots must still apply.

Package membership activity needs an explicit reviewed public projection. Expose only permitted old/new name text on an already accessible record; keep package IDs and other metadata private. Do not weaken the existing deny-by-default activity field policy.

Update managed-person deletion/usage checks to include package responsibility. Update project deletion, database fixtures, package-aware record selectors, serialization and print tests. Reuse existing pagination/filter conventions and record rendering; avoid a parallel permission or CRUD framework.

### Package list, detail and confirmation contracts

These contracts use the work_packages table and record foreign key specified in §5. They require no additional stored counters or schema fields.

- **Package list response:** per-package `total`, `outstanding`, `overdue` and counts by status. Compute them in one grouped query at request time; there are no stored counters and no per-package queries.
- **Package detail response:** the same figures, plus counts by subtype and status for the table.
- **Records:** reuse the records endpoint with the package filter (§G) for both the package page and the Records list.
- **Record list items:** carry `workPackageId` (§6). The client resolves names from the owner's package list, as it already does for people.
- **Delete conflict:** returns the current record count (§4) for the blocked dialog (§F).
- **Confirmation in §D:** client-side only, using a fresh read. The server needs no confirmation flag.

## 7. Detailed screen and interaction requirements

Sections A–M specify the final screen behaviour. These are integral requirements of this design, not a separate amendment. References such as §I and §M1 refer to the labelled subsections below.

### A. Navigation

**A1 — Work packages menu item and routes.**

- Add an owner-only **Work packages** link to the project menu, immediately after **Records**.
- Routes:
  - list: `/projects/:projectId/work-packages`
  - detail: `/projects/:projectId/work-packages/:packageId`
- Today, [App.tsx](../../src/web/App.tsx) matches only `/^\/projects\/(\d+)\/(records|lists)(?:\/(\d+))?$/`.
- The active menu item carries `aria-current="page"` for its whole family of routes:
  - Records for the record list and record pages;
  - Work packages for the package list and package pages.
  - Today only Administration sets `aria-current`.
- A record opened from a package page returns there on **Back**. Extend the existing `from` handling with an allow-listed internal target. Never accept arbitrary URLs.
- *Accept when:* each route marks exactly one menu item as current, and Back from a record returns to the page that opened it.

**A2 — Phone menu.**

- At 650 px and below, the project menu stays on one row and scrolls sideways within itself.
- The scrollbar is hidden and the right edge fades to show there is more.
- The current item is scrolled into view on load.
- *Accept when:* at 360 px and 390 px wide, the page has no horizontal overflow and every menu item can be reached.

### B. Work packages list page

Blueprint: change map → *Work packages page*.

- **Header:**
  - title **Work packages**, with the project name as a muted subtitle;
  - a primary **New work package** button, shown only when packages exist; the empty state has its own button.
- **Search:**
  - "Find a work package" filters by name as you type, using `foldText` ([text.ts](../../src/domain/text.ts)), so case, accents and final sigma are ignored. This is the same normalisation as the name-uniqueness rule.
  - A status line reads "5 work packages" or "1 of 5 work packages".
- **Table (desktop) columns:**

  | Column | Content |
  |---|---|
  | Work package | Name as a link, with the description below it as one muted, clamped line |
  | Status | Package status pill (§L3) |
  | Responsible | Person, or "—" |
  | Target date | `dateText`, plus a **Past target** chip (§M1) |
  | Records | Status bar (§M2), then "N of M outstanding", then "K overdue" on its own line in red when K > 0; "No records" when the package is empty |

- The whole row is clickable, but the name link stays the accessible target.
- **Order:** In progress, Planned, On hold, Completed, Cancelled; then by name using the current language's collation.
- **Phone:** each row becomes a card. The name and description sit on top, followed by label/value rows for the other columns.
- **States:**
  - *Empty:* heading "No work packages yet", one sentence explaining the purpose, and **New work package**. This sentence appears only in the empty state.
  - *No match:* "No work package matches “…”."
  - Loading and errors use the existing patterns.
- *Accept when:*
  - counts match §M1 for mixed subtypes and statuses, including Draft;
  - "πλακακια" finds "Πλακάκια";
  - a Completed package past its target date shows no chip;
  - phone cards fit 360 px.

### C. Package page

Blueprint: change map → *Package page*.

From top to bottom:

1. **Breadcrumb:** Work packages › *Name* (`nav` with `aria-label="Breadcrumb"`; the current item has `aria-current="page"`).
2. **Identity line:** the label "Work package", the package status pill, and an info icon giving the status definition from §8.
3. **Title:** the package name. Long Greek names wrap (`overflow-wrap: anywhere`).
4. **Actions:**
   - **Edit package** (primary);
   - **New record**, which opens the existing capture form with this package preselected (§4);
   - **Delete package** as quiet red text aligned right, styled like Delete record (§F).
5. **Summary strip:** the same component as the record's next-action strip. Fields:
   - Responsible person (omitted if empty);
   - Target date, with a Past target chip;
   - Outstanding records: "N of M", plus "· K overdue" in red when K > 0, or "None yet".
6. **Mismatch notice:** shown when the status is Completed or Cancelled and records are still outstanding.
   - Text: "**Marked Completed** · N records are still outstanding. Package status is set by hand and never changes records."
   - Uses the attention style from §L, with `role="note"`. It is not an error.
7. **Description card** (omitted if empty).
8. **Progress card** (omitted when the package has no records):
   - Three figures: outstanding (labelled "outstanding of M records"), overdue (red only when above zero), and closed.
   - The status bar at full width, with a legend giving each count.
   - A **By subtype and status** table:
     - rows: each subtype present, then an **All records** footer row;
     - columns: each status present, in lifecycle order, then **Outstanding** and **Total**;
     - zeros in muted text.
   - Note: "Calculated from the records each time the page opens. Draft counts as outstanding."
9. **Records card:**
   - Heading "Records (M)", plus a link **Open in Records with all filters** that opens the Records list filtered to this package.
   - Records use the existing record-card component, with outstanding records first, then by ID. Do not build a second list.
   - Cards here leave out the package name.
   - *Empty:* "No records in this package yet.", a hint sentence, and **New record in this package**.
- A missing package, or one from another project, uses the existing not-found handling.
- *Accept when:*
  - the totals equal the table footer;
  - the table equals the legend;
  - the mismatch notice appears and disappears with status changes;
  - New record preselects the package.

### D. Completing or cancelling a package that still has outstanding records

Blueprint: change map → *Completing a package*.

- **Trigger:** saving a package edit that changes the status to Completed or Cancelled while the package has outstanding records.
  - Count them from a fresh read when **Save** is pressed, not from the counts loaded with the page.
  - The server does not block the change (§2).
- **Dialog:**
  - title: "Mark “*Name*” as Completed?";
  - text: "N records in this package are still outstanding, K of them overdue:";
  - a list of up to five records as "ID · status", then "and X more";
  - closing note: "Their statuses, due dates and people do not change."
- **Buttons:**
  - **Mark as Completed** (or **Mark as Cancelled**), primary;
  - **Go back**, which returns to the form with every value intact and focus on Status.
- *Accept when:* confirming saves only the package, no record changes, and Go back loses no input.

### E. Package form

Blueprint: change map → *Package form*.

- Use one form for creating and editing; fields and validation follow §4.
- **Layout:**
  - Name, marked "(required)" in muted text;
  - Description;
  - Responsible person and Target date side by side (stacked on phones);
  - Status, with an info icon and the selected status's definition shown under the select as it changes.
- **Errors:** shown under Name, with `aria-invalid` and `aria-describedby`. Focus moves to the field. The form is never cleared.
  - Empty name: "Enter a name for the work package."
  - Duplicate name (the server's conflict decides; a client check is optional): "“*Existing name*” already exists in this project. Names are compared without case or accents."
  - Other failures use `ErrorNotice`.
- **Unknown outcome:** follow [Projects.tsx](../../src/web/projects/Projects.tsx). After an unconfirmed result, block another submit until the list has been refreshed, so a create is never sent twice.
- **Buttons:** **Create work package** when creating, **Save package** when editing, and **Cancel**.
- **Opened from the record editor:** also show "Created straight away and selected in this record. It stays even if you cancel your record edits."
- *Accept when:*
  - "tiling WORKS" is rejected while "Tiling works" exists;
  - every field keeps its value after any error.

### F. Delete package

- **Delete package** is always available to the owner. It opens one dialog titled "Delete work package?" showing the package name.
- **When the package has records**, the dialog explains why it cannot be deleted:
  - text: "This package contains N records. Move them to another package or set them to No work package first. Deleting a package never deletes records."
  - **Show its records** opens the Records list filtered to this package;
  - **Keep package** closes the dialog.
- **When the package is empty:**
  - text: "The package is empty, so no record is affected. Its name stays in the history of records that used it."
  - an input labelled "Type the package name to confirm"; it must match exactly, as project deletion does;
  - **Delete package** (danger), enabled only on a match, and **Keep package**.
- **Race:** if the server returns a conflict because records were assigned meanwhile, switch the dialog to the blocked state with the returned count.
- After deletion, go to the package list and show a confirmation notice.
- *Accept when:* a populated package can never be deleted, and the race test shows the blocked state.

### G. Records list

Blueprint: change map → *Records filter*.

- **Work package filter:** add it to the visible filter row next to search, not inside the collapsed Filters. Options:
  - **All records, with or without a package**: no parameter;
  - **Ungrouped · no work package**: an explicit "none" value;
  - an **Active packages** group, then a **Completed or cancelled** group; each option reads "*Name* · *Status*".
- **URL parameter:**
  - absent, "none" and a package ID must be distinguishable (§6);
  - an unknown ID shows the existing "Invalid filter" chip.
- **Chip:** "Work package: *Name* ×" or "Work package: Ungrouped ×", in the existing chip style. It keeps the existing Apply behaviour.
- **Record cards:**
  - show the package name, with a package icon and a hidden "Work package:" prefix for screen readers, unless the list is filtered to one package;
  - show the due date through `dateText`, with the due chip from §J4. This fixes today's raw ISO date.
- *Accept when:* All, Ungrouped and a single package each return the right records, and the URL round-trips each of them.

### H. Record header: the package in the identity line

Blueprint: change map → *Record header*; switch the viewer in the blueprint controls.

- When the record has a package, the identity line reads: ID · subtype (info) · status (info) · package icon + name. The name has a hidden "Work package:" prefix for screen readers.
- It replaces the separate package line below the title.
- **Owner:** the name links to the package page.
- **Contributor or shared reader:** plain text only. There is no link, and the projection carries no ID (§6).
- Hidden while the record is being edited, like the rest of the identity line.
- *Accept when:* the contributor and shared views contain no package link and no package ID.

### I. Record editor: the Work package field

Blueprint: change map → *Editing a record*.

- **Position:** in the Work card, directly after Description and before Severity / Completion.
- **Label row:** "Work package", with a text button **+ New package** right next to the label, not at the far edge.
- **Control:** a single-choice picker. Build it on the searchable picker that §3 introduces for Trades and Tags. Today's [TagPicker.tsx](../../src/web/record/TagPicker.tsx) is a different component.
  - The trigger shows the current choice and its status pill, or "No work package".
  - The panel contains:
    - a search box (`foldText`);
    - a radio group, with **No work package** first;
    - an **Active** group, then a **Completed or cancelled** group; each option shows its name and status pill;
    - when nothing matches: "No work package matches. Use + New package to create one."
  - Completed and Cancelled packages stay selectable (§4).
- **Keyboard and pointer:**
  - The trigger toggles the panel, and opening it moves focus to search.
  - Arrow keys change the choice **without closing**.
  - **Enter** or **Escape** closes the panel and returns focus to the trigger.
  - A pointer choice closes the panel.
  - Clicking or focusing outside closes it without moving focus.
  - Closing never discards the choice.
  - **Enter** in the search box never submits the record form.
- **Pending note** under the field, shown whenever the draft differs from the saved value:
  - "Joins “X” when you save the record."
  - "Leaves “X” when you save the record."
  - "Moves from “X” to “Y” when you save the record."
- **+ New package** opens the package form (§E) without losing the record draft. On success:
  - the new package is selected in the draft;
  - "“X” was created and selected. The package stays even if you cancel these record edits." appears;
  - focus returns to the picker trigger.
- *Accept when:*
  - cancelling the record edit keeps the new package and leaves the record unassigned;
  - saving assigns it;
  - every keyboard rule above holds.

### J. Record overview and dates

Blueprint: change map → *Record overview*.

- **J1 — Section order** in the Overview card:
  1. Description;
  2. Record details: Priority, Severity, Completion, on one row as described in §3;
  3. Classification (Quality Issue or Detail Clarification);
  4. Decision and instruction, including Options considered;
  5. Location and references, with the location photos;
  6. Sequence and dates (collapsible);
  7. Public Notes, when populated;
  8. Private details (owner-only, collapsible);
  9. Verification history (compact, collapsible, with the check count).

  All section headings in the card use the same level and size.
- **J2 — Two columns** for short values; full width for long text. Render in this DOM order so the grid fills naturally, and do not use `grid-auto-flow: dense`. Empty values are still left out (§3), and phones use one column.

  | Section | Order (`|` = same row; *full* = full width) |
  |---|---|
  | Classification, Quality Issue | Type of problem \| Stage |
  | Classification, Detail Clarification | Question (*full*) |
  | Decision, Quality Issue | Disposition \| Chosen option; Decided by \| Decided on; Correction (*full*); Instruction text (*full*) |
  | Decision, Detail Clarification | Route \| Issued by; Chosen option \| Decided by; Decided on; Instruction text (*full*) |
  | Location and references | Location \| Trades; Tags \| Reference; Location Notes (*full*) |

- **J3 — Instruction text** is shown as a quoted block: accent left border, light tint, line breaks preserved. The wording is shown exactly as issued.
- **J4 — Dates and due chip:**
  - Every displayed date uses `dateText` ([helpers.ts](../../src/web/record/helpers.ts)).
  - Next to the due date of an outstanding record, in the summary strip and on every record card:
    - "Overdue by N days" (red, clock icon) when before today;
    - "Due today" or "Due tomorrow" (neutral) when that close;
    - nothing otherwise.
  - Print is unchanged.
- **J5 — Add buttons:** every gallery or section heading with a "+" icon (Location photos, Measurements, Log, Options considered) puts the icon directly after the heading.
- **J6 — Verification history:** retain the existing read-only Overview block independently of Activity history. Each check shows its date, checker, method, outcome and full note, preserving note line breaks and the existing ordering. Keep method/outcome definitions accessible through the agreed info controls. Use the existing English/Greek labels. Do not reduce the history to the latest result or substitute Activity events, which do not currently render verification notes.
- **J7 — Sequence and dates:** show Must be done before and Requires first beside one another on desktop, stacked in that order on phones, followed by Created and Updated. Requires first is derived from incoming precedence links and remains read-only. Preserve the existing reader projections: the owner sees the owner detail; contributor/shared readers receive the existing filtered human IDs and titles, excluding Draft references and internal record IDs. Do not add cross-record navigation or access rights through these relationships. Preserve Public Notes and owner-only Private details after this block as listed in J1.
- **Reader visibility:** J6 and J7 reuse the existing authorized record data and projection rules. Verification notes already included in the reader projection remain visible; private record fields and inaccessible record details must not be introduced by the rearrangement. [Overview.tsx](../../src/web/record/Overview.tsx) and [projection.ts](../../src/server/sharing/projection.ts) are the implementation baseline.
- *Accept when:*
  - both languages render dates through `dateText`;
  - due chips follow the today boundary in §M1, tested at the date boundary;
  - the DOM order matches J2;
  - failed and passed checks retain their individual notes in Verification history, and incoming prerequisites remain visible under Requires first with the existing reader restrictions (§9).

### K. Phone record actions

Blueprint: narrow the window below 700 px; the application uses 650 px.

- At 650 px and below, **Edit record** and **Change status** stay visible.
- **Sharing**, **Activity history** and **Delete record** move into **More**, which opens a bottom sheet:
  - title "More record actions";
  - Delete last, in red, below a separator.
- **Escape** or an outside tap closes the sheet, and focus returns to More. A panel opened from the sheet also returns focus to More when it closes.
- Only actions the viewer may use appear. If exactly one remains, show it as a normal button instead of More.
- Desktop is unchanged.
- *Accept when:* each role sees only its permitted actions, and focus returns correctly.

### L. Colours

The agreed blue direction stays (§3). These are the complete tokens for this change; the blueprint's **Colours** switch compares the agreed and adjusted versions.

**L1 — Base tokens:**

| Token | Value |
|---|---|
| Accent: primary buttons, links, active menu | `#315dc8` |
| Soft accent | `#eef3fd` |
| Text | `#27313f` |
| Muted text | `#616b78` |
| Lines | `#dfe3e8` |
| Page | `#f5f6f8` |
| Cards | `#ffffff` |

**L2 — Adjustments to the agreed set:**

1. **Focus ring:** `3px solid #315dc8`, offset 3 px. It replaces amber (`#c38320` in the app today, `#ba741f` in the iteration 6 preview), because amber now means "waiting" and "safety".
2. **Neutral record tags** (Draft, Cancelled, Superseded) keep `#edf0f3` / `#505b69` and gain an inset 1 px `#cdd3dc` edge. Their fill is only 1.1:1 against the page.
3. **Ready for verification** becomes plum: `#f8ebf3` background, `#8a2f6e` text. Purple sat too close to blue in the status bar.
4. **Safety notice:** keeps amber (`#fff5e5`, 4 px `#a76518` left border, `#74491c` text) and gains a warning-triangle icon (`aria-hidden`). The text is unchanged.

The other record-status colours follow §3:

| Statuses | Background / text |
|---|---|
| Open, Issued, In progress | `#eaf0fd` / `#264da0` |
| Awaiting decision, On hold | `#fff3d9` / `#86520c` |
| Closed | `#e9f4eb` / `#326843` |

**L3 — Package status pills (new).**

- Style: outlined pill, 1.5 px border in the text colour, white fill, a leading dot, label always visible.
- Colours:
  - Planned and Cancelled: `#505b69`; Cancelled has a hollow dot;
  - In progress: `#264da0`;
  - On hold: `#86520c`;
  - Completed: `#326843`.
- Record statuses stay filled tags. Package Completed and record Closed share the green family but never look alike.

**L4 — Reserved red.** `#a3322c` (overdue chip background `#fdeeec`) is used only for overdue dates and destructive actions, always with words.

**L5 — Attention notice** (the package mismatch in §C): white background, `#ecdcbc` border, 4 px `#b97a10` left border, `#5e4413` text.

**L6 — Contrast (WCAG), all passing:**

| Pair | Ratio |
|---|---|
| Text on white | ≥ 12:1 |
| Muted text on page | 5.0:1 |
| Accent on white | 5.9:1 |
| Primary button text | 5.9:1 |
| Blue focus ring on page | 5.5:1 (amber was 3.5:1) |
| Plum tag | 6.7:1 |
| Overdue chip | 6.1:1 |

The blueprint's contrast table covers every pair.

**No dark mode** is proposed in this change.

### M. Shared rules and components

**M1 — Definitions.**

| Term | Meaning |
|---|---|
| Outstanding | Any record status except Closed, Cancelled and Superseded; Draft counts (§4) |
| Overdue | Outstanding and due date before today |
| Past target | Package target date before today and package status Planned, In progress or On hold |
| Today | The calendar date in **Europe/Athens** (approved; see §10) |

- *Today* comes from one helper in `src/domain`, used by the server (package totals) and the client (due chips). It is a fixed constant, not a setting, consistent with §2.
- The application has no record-overdue logic yet; the only "overdue" today is backup monitoring.

**M2 — Status bar.**

- **Segments**, in this fixed order:
  1. Closed `#3d8655`
  2. Ready for verification `#a8468e`
  3. Open / Issued / In progress `#315dc8`
  4. Awaiting decision / On hold `#b97a10`
  5. Draft `#c3c9d2`
  6. Cancelled / Superseded: hatched `#aab2bd` on white
- **Geometry:**
  - width proportional to count, at least 4 px per segment;
  - 2 px white gaps between segments;
  - 8 px high in the list and 14 px on the package page, with rounded ends.
- **Labels and access:**
  - Legend labels join the vocabulary labels (for example "Open / Issued / In progress"), so no new translations are needed.
  - The bar has `role="img"` with an `aria-label` listing the counts, and each segment shows its label and count on hover.
- **Colour check:** the four chromatic fills pass the lightness, chroma and normal-vision checks. Amber against green under protanopia is ΔE 6.3, which is acceptable only with secondary encoding.
  - Therefore the bar is never shown without its text: "N of M outstanding" in the list, and the legend plus table on the package page.
  - Omit zero-count groups. Keep the approved ordering and the 2 px white separator between every pair of rendered segments. Green and amber may consequently be neighbours in sparse packages; the separator and accompanying text are the intended non-colour safeguard, not the presence of intervening status groups.
  - Do not add artificial segments for zero-count groups. Preserve exact textual counts in the accessible bar label, segment labels and package-page legend/table. For eight Closed and two On hold records, the list reads “2 of 10 outstanding”, the accessible label identifies Closed: 8 and On hold: 2, and the package-page legend/table expose those same counts.

## 8. Approved English and Greek wording

The owner approved the following wording on 2026-10-06 after reviewing the numbered list in chat. This is the consolidated wording baseline. Row numbers match that review. N, M and K are counts; X and Y are names. Handle singular and plural forms separately. Retain the existing Record = Καταγραφή terminology. These translations are documentation only until implementation.

| # | English | Approved Greek |
|---|---|---|
| 1 | Work package / Work packages | Πακέτο εργασιών / Πακέτα εργασιών |
| 2 | New work package | Νέο πακέτο εργασιών |
| 3 | Find a work package / Search work packages | Αναζήτηση πακέτων εργασιών |
| 4 | Name (required) | Όνομα (υποχρεωτικό) |
| 5 | Description | Περιγραφή |
| 6 | Responsible person | Υπεύθυνος |
| 7 | Target date | Ημερομηνία στόχου |
| 8 | Status | Κατάσταση |
| 9 | Records | Καταγραφές |
| 10 | Edit package | Επεξεργασία πακέτου |
| 11 | Create work package | Δημιουργία πακέτου εργασιών |
| 12 | Save package | Αποθήκευση πακέτου |
| 13 | Delete package | Διαγραφή πακέτου |
| 14 | Cancel / Go back | Ακύρωση / Επιστροφή |
| 15 | New record in this package | Νέα καταγραφή σε αυτό το πακέτο |
| 16 | More / More record actions | Περισσότερα / Περισσότερες ενέργειες καταγραφής |
| 17 | Planned | Προγραμματισμένο |
| 18 | Work in this package has not started. | Οι εργασίες του πακέτου δεν έχουν ξεκινήσει. |
| 19 | In progress | Σε εξέλιξη |
| 20 | Work in this package is underway. | Οι εργασίες του πακέτου βρίσκονται σε εξέλιξη. |
| 21 | On hold | Σε αναμονή |
| 22 | Work in this package is temporarily paused. | Οι εργασίες του πακέτου έχουν ανασταλεί προσωρινά. |
| 23 | Completed | Ολοκληρωμένο |
| 24 | The owner considers the scope of this package finished. | Ο ιδιοκτήτης θεωρεί ότι το αντικείμενο του πακέτου έχει ολοκληρωθεί. |
| 25 | Cancelled | Ακυρωμένο |
| 26 | This package will not proceed. | Το πακέτο δεν θα υλοποιηθεί. |
| 27 | 1 work package / N work packages | 1 πακέτο εργασιών / N πακέτα εργασιών |
| 28 | N of M work packages | N από M πακέτα εργασιών |
| 29 | No work packages yet | Δεν υπάρχουν ακόμη πακέτα εργασιών |
| 30 | A work package groups related Tasks, Quality Issues and Detail Clarifications under one name, such as Tiling works. | Ένα πακέτο εργασιών συγκεντρώνει σχετικές εργασίες, ζητήματα ποιότητας και τεχνικές διευκρινίσεις κάτω από ένα όνομα, π.χ. «Εργασίες πλακιδίων». |
| 31 | No work package matches “X”. | Δεν βρέθηκε πακέτο εργασιών για την αναζήτηση «X». |
| 32 | Progress | Πρόοδος |
| 33 | Outstanding records | Καταγραφές σε εκκρεμότητα |
| 34 | N of M outstanding | N από M σε εκκρεμότητα |
| 35 | 1 overdue / N overdue | 1 εκπρόθεσμη / N εκπρόθεσμες |
| 36 | Closed | Κλειστές |
| 37 | Past target | Υπέρβαση ημερομηνίας στόχου |
| 38 | No records / None yet | Χωρίς καταγραφές / Καμία ακόμη |
| 39 | By subtype and status | Ανά τύπο καταγραφής και κατάσταση |
| 40 | All records / Outstanding / Total | Όλες οι καταγραφές / Σε εκκρεμότητα / Σύνολο |
| 41 | Calculated from the records each time the page opens. Draft counts as outstanding. | Τα στοιχεία υπολογίζονται από τις καταγραφές κάθε φορά που ανοίγει η σελίδα. Οι πρόχειρες καταγραφές υπολογίζονται στις εκκρεμότητες. |
| 42 | Records (M) | Καταγραφές (M) |
| 43 | Open in Records with all filters | Άνοιγμα στη λίστα καταγραφών με όλα τα φίλτρα |
| 44 | No records in this package yet. | Δεν υπάρχουν ακόμη καταγραφές σε αυτό το πακέτο. |
| 45 | Choose this package in a record’s Work package field, or create a record here. | Επιλέξτε αυτό το πακέτο στο πεδίο «Πακέτο εργασιών» μιας καταγραφής ή δημιουργήστε μια νέα καταγραφή εδώ. |
| 46 | Overdue by 1 day / N days | Καθυστέρηση 1 ημέρας / N ημερών |
| 47 | Due today / Due tomorrow | Προθεσμία σήμερα / Προθεσμία αύριο |
| 48 | Marked Completed / Marked Cancelled | Έχει οριστεί ως ολοκληρωμένο / Έχει οριστεί ως ακυρωμένο |
| 49 | 1 record is still outstanding. | 1 καταγραφή παραμένει σε εκκρεμότητα. |
| 50 | N records are still outstanding. | N καταγραφές παραμένουν σε εκκρεμότητα. |
| 51 | Package status is set by hand and never changes records. | Η κατάσταση του πακέτου ορίζεται χειροκίνητα και δεν αλλάζει τις επιμέρους καταγραφές. |
| 52 | Mark “X” as Completed? | Να οριστεί το πακέτο «X» ως ολοκληρωμένο; |
| 53 | Mark “X” as Cancelled? | Να οριστεί το πακέτο «X» ως ακυρωμένο; |
| 54 | N records in this package are still outstanding, K of them overdue: | N καταγραφές του πακέτου παραμένουν σε εκκρεμότητα, από τις οποίες K είναι εκπρόθεσμες: |
| 55 | Their statuses, due dates and people do not change. | Οι καταστάσεις, οι προθεσμίες και τα πρόσωπα που έχουν οριστεί στις καταγραφές δεν αλλάζουν. |
| 56 | Mark as Completed / Mark as Cancelled | Ορισμός ως ολοκληρωμένο / Ορισμός ως ακυρωμένο |
| 57 | And N more | Και N ακόμη |
| 58 | Enter a name for the work package. | Συμπληρώστε το όνομα του πακέτου εργασιών. |
| 59 | “X” already exists in this project. Names are compared without case or accents. | Υπάρχει ήδη πακέτο με το όνομα «X» σε αυτό το έργο. Στη σύγκριση ονομάτων δεν λαμβάνονται υπόψη οι τόνοι ή η διάκριση πεζών και κεφαλαίων. |
| 60 | Created straight away and selected in this record. It stays even if you cancel your record edits. | Το πακέτο δημιουργείται αμέσως και επιλέγεται σε αυτή την καταγραφή. Παραμένει ακόμη κι αν ακυρώσετε τις αλλαγές στην καταγραφή. |
| 61 | Delete work package? | Διαγραφή πακέτου εργασιών; |
| 62 | This package contains N records. Move them to another package or set them to No work package first. Deleting a package never deletes records. | Το πακέτο περιέχει N καταγραφές. Μεταφέρετέ τις πρώτα σε άλλο πακέτο ή επιλέξτε «Χωρίς πακέτο εργασιών». Η διαγραφή πακέτου δεν διαγράφει καταγραφές. |
| 63 | Show its records / Keep package | Εμφάνιση καταγραφών / Διατήρηση πακέτου |
| 64 | The package is empty, so no record is affected. Its name stays in the history of records that used it. | Το πακέτο είναι κενό, οπότε δεν επηρεάζεται καμία καταγραφή. Το όνομά του παραμένει στο ιστορικό των καταγραφών που ανήκαν σε αυτό. |
| 65 | Type the package name to confirm | Πληκτρολογήστε το όνομα του πακέτου για επιβεβαίωση |
| 66 | All records, with or without a package | Όλες οι καταγραφές, με ή χωρίς πακέτο |
| 67 | No work package / Ungrouped | Χωρίς πακέτο εργασιών / Χωρίς πακέτο |
| 68 | Active packages / Active | Ενεργά πακέτα / Ενεργά |
| 69 | Completed or cancelled | Ολοκληρωμένα ή ακυρωμένα |
| 70 | Work package: X | Πακέτο εργασιών: X |
| 71 | + New package | + Νέο πακέτο |
| 72 | No work package matches. Use + New package to create one. | Δεν βρέθηκε πακέτο εργασιών. Επιλέξτε «+ Νέο πακέτο» για να δημιουργήσετε ένα. |
| 73 | Joins “X” when you save the record. | Η καταγραφή θα προστεθεί στο πακέτο «X» όταν την αποθηκεύσετε. |
| 74 | Leaves “X” when you save the record. | Η καταγραφή θα αφαιρεθεί από το πακέτο «X» όταν την αποθηκεύσετε. |
| 75 | Moves from “X” to “Y” when you save the record. | Η καταγραφή θα μεταφερθεί από το πακέτο «X» στο «Y» όταν την αποθηκεύσετε. |
| 76 | “X” was created and selected. The package stays even if you cancel these record edits. | Το πακέτο «X» δημιουργήθηκε και επιλέχθηκε. Παραμένει ακόμη κι αν ακυρώσετε τις αλλαγές στην καταγραφή. |

Use the shared localization and vocabulary systems. Package names and descriptions remain user-entered text without automatic translation. Package Completed is distinct from record Closed. Row 36 is the plural count/legend label for closed records, not a replacement for the existing singular record-status vocabulary.

## 9. Verification

- **Read-only history and prerequisites regression:** use a record with a failed verification followed by a passed verification, distinct notes on both checks, and an incoming non-Draft prerequisite. In owner, contributor and shared views, expand Overview’s Verification history and Sequence and dates. Assert both checks’ dates, checkers, methods, outcomes and full notes, plus Requires first. Add a Draft prerequisite and private record fields to the fixture: the owner retains its existing view; contributor/shared projections exclude the Draft reference, internal dependency IDs and private fields. Reading a prerequisite grants no access to that other record. Test in English and Greek, on desktop and phone.
- **Sparse status-bar regression:** use eight Closed and two On hold records, with all other groups empty. Assert exactly two segments in the approved order with a white separator, no zero-count placeholders, and exact counts in list text, accessible label and package-page legend/table. Keep the existing mixed-status case.
- Verify every field/action in section 3 against the current application. Preserve real measurement phases, multiple rows, precision, full Log metadata and all subtype rules. Blueprint sample values must not replace domain vocabulary.
- Exercise keyboard, touch and desktop flows in English and Greek, including long names, empty lists, unsaved drafts, failed saves/uploads, dialog closing and narrow viewports.
- Test package creation, rename uniqueness, edit/cancel, assignment, reassignment, ungrouping and filters. Test retired people and another project's package/person IDs.
- Test derived totals, overdue boundaries, mixed record subtypes, empty packages and confirmation when completing/cancelling with outstanding records.
- Test deletion against concurrent assignment/reference/upload, typed confirmation, non-reused IDs, protected access and retained blobs. A denied operation must leave data unchanged.
- Test owner/contributor/anonymous boundaries, public activity and print projections. A package name never grants access to other records.
- Replay migration 0007 against a populated baseline database. Check foreign keys, integrity, unchanged record counts, NULL assignments, backups and restore with the new schema.
- Run the repository's relevant automated checks and browser tests before integration. Deployment follows the existing release/backup procedure and is not part of drafting this design.

### Detailed acceptance checklist

Extend the existing suites in [tests/browser](../../tests/browser) and [tests/domain](../../tests/domain). Run them in English and Greek, on desktop and at 360 / 390 px.

- **Domain:**
  - the today helper at the Athens midnight boundary;
  - outstanding, overdue and past-target rules;
  - totals across mixed subtypes and statuses, including Draft, Cancelled and Superseded.
- **Package list:**
  - active menu state;
  - counts and status bar text, including the Closed/On hold-only sparse case;
  - Past target only for open package statuses;
  - search ignoring case, accents and final sigma;
  - ordering;
  - empty and no-match states;
  - phone cards without overflow.
- **Package page:**
  - breadcrumb;
  - summary strip;
  - mismatch notice;
  - figures, legend and table agreeing;
  - records listed outstanding first;
  - New record preselecting the package;
  - not-found and wrong-project cases.
- **Confirmation (§D):**
  - fresh count and list;
  - Go back keeps every value;
  - no record changes.
- **Package form:**
  - empty and duplicate errors, including case and accent variants;
  - unknown-outcome guard;
  - values kept after errors.
- **Delete:**
  - blocked state with Show its records;
  - typed confirmation;
  - the conflict race switching to the blocked state.
- **Records filter:**
  - All, Ungrouped and a single package;
  - chips;
  - invalid ID;
  - URL round trip;
  - package name on cards.
- **Record header:** owner link versus contributor and shared plain text; no package ID in those projections.
- **Editor field:**
  - position;
  - grouping;
  - search;
  - the keyboard rules in §I;
  - all three pending notes;
  - inline creation keeping the draft;
  - Cancel keeping the new package.
- **Overview:**
  - section order;
  - J2 DOM order;
  - full Verification history and Requires first under the existing owner/contributor/shared restrictions (J6/J7);
  - the instruction quote;
  - `dateText` everywhere;
  - due chips at the boundaries.
- **Phone:**
  - More sheet per role;
  - focus returning to More;
  - menu scrolling;
  - no page-level horizontal overflow.
- **Colours:**
  - focus ring;
  - status tags and package pills;
  - contrast as in §L6.

## 10. Owner decisions — accepted 2026-10-06

The owner accepted decisions 1–4 and 6, then approved the reviewed 76-row English/Greek list in §8. None of these six points remains open. This records approval of these decisions and wording; it does not by itself authorise application implementation or deployment.

1. **Today boundary:** Europe/Athens for record overdue dates and package target dates (§M1).
2. **Ready for verification colour:** plum, as specified in §L2.
3. **Records filter wording:** “All records, with or without a package”.
4. **Delete package:** always opens a dialog; populated packages show the explanatory blocked state (§F).
5. **Greek wording:** the revised, numbered English/Greek table in §8 is approved. It supersedes the earlier proposed translations.
6. **Package list order:** In progress, Planned, On hold, Completed, Cancelled; then by name using the current language's collation (§B).

## 11. Delivery and documentation closeout

- [docs/specs/v1.md](../specs/v1.md):
  - screens and navigation;
  - the Records filter;
  - the record header;
  - dates and overdue;
  - phone actions;
  - colours, where specified.
- [docs/guides/web-interface.md](../guides/web-interface.md).
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md): the "Proposed change" section.
- [docs/reference/data-model.md](../reference/data-model.md) (including the implemented work-package model).
- The status of this consolidated design, following the documentation standard. The earlier amendment stays superseded.

If no specification change is needed for an item, record that conclusion at closeout.

After approval, write the implementation plan against the then-current repository. At delivery, reconcile the maintained specification, architecture, data-model reference and affected guides. Mark this design Historical only after reconciliation, recording implementation commits and material deviations. Keep existing production acceptance evidence separate from design/prototype checks.

## 12. Explicit exclusions

No nested packages, N:N membership, automatic scheduling, package permissions, package attachments, package-level tags/severity/priority, package percentage entry, bulk reassignment UI, new project hierarchy or changes to the hosting stack. Existing features stay available. Future simplification will be informed by actual use.

No dark mode or package-list filters beyond name search are added. The project Records list does receive its specified package filter. Printing adds the package name as specified in §6; it does not acquire the new screen-only overdue chips. Measurements, Log, evidence and sharing retain their existing capabilities. Record status rules remain unchanged; record deletion is the explicit new operation described in §3.

## 13. Evidence and review provenance

On 2026-10-06, the standalone preview was exercised in Chrome for package creation, retained unsaved record edits, assignment, rename and ungrouping, including a narrow phone viewport. No script errors or page-level horizontal overflow were observed in those checks. The proposed SQL applied successfully after migrations 0001–0006 in an empty in-memory SQLite database. This is a syntax/integration probe, not a populated migration replay or application test suite. Production and application source files were not changed.

The [iteration 7 review](2026-10-06-record-ui-and-work-packages-iteration-7.md) is retained as superseded review history. Its findings and requirements are incorporated above. The colour contrast figures in §L originate from that review; consolidation does not claim an independent accessibility audit or a full application replay. All six owner decisions and all 76 approved wording rows have been preserved.

### Review corrections after 41ca013

The follow-up review identified missing explicit reading destinations for verification history and reverse dependencies, and a sparse-data contradiction in status-bar colour separation. Sections 3, J, M2 and 9 now specify those destinations, preserve existing reader projections and require sparse/mixed status-bar cases. These are design-only corrections. No application/browser suite was run for this documentation change.
