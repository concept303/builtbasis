# Record interface and work packages — iteration 7 review and amendments

> **Document type:** Design document (amendment)
> **Status:** Superseded · 2026-10-06
> **Superseded by:** [Record interface and work packages](2026-10-06-record-ui-and-work-packages-design.md) (the single consolidated design)
> **Blueprint:** [Iteration 7 preview](2026-10-06-ui-batch-7.html) — standalone and illustrative; not application code
> **Authority:** Review history only. All requirements, accepted decisions and approved wording have been consolidated into the document linked above. Do not use this amendment as a second implementation baseline.
> **Retention:** Preserved for review provenance. The body below records the earlier amendment and its original section references.

## 1. For the implementing agent

**Starting point.** The application does not yet implement the base design. Checked on 2026-10-06 at commit `6b56f4f`:

- The record page still has six tabs, including Activity and Sharing ([RecordPage.tsx](../../src/web/record/RecordPage.tsx)).
- [styles.css](../../src/web/styles.css) still uses the teal palette with an amber focus ring.
- The record list shows raw ISO due dates ([RecordList.tsx](../../src/web/home/RecordList.tsx)).
- There is no work-package code or migration.

Implement base design §3–§7 together with this amendment. The record-page items below refine the base §3 layout, not the current screen.

**Read in this order:** the base design, then this document, then the blueprint.

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
| Change map, blueprint controls, colour switch, contrast table, sample data, "Opens in this blueprint" tag, location sketch | Never shipped (base §3) |

## 2. Review findings

The iteration 6 preview gets the record page largely right. The work-package part, which is new, had most of the gaps.

| # | Finding in the iteration 6 preview | Change |
|---|---|---|
| 1 | The package list opens as a modal panel over the current record. Base §4 asks for a project page that reuses the record list. | A1, B |
| 2 | The menu keeps "Records" marked active on every page. | A1 |
| 3 | No record totals; the panel shows "0 sample records". Derived totals are the main value of a package. | B, C, M2 |
| 4 | Package status is plain text with no colour mapping. | L3 |
| 5 | Package detail stacks every attribute vertically and uses an "All work packages" button instead of a breadcrumb. Delete has the same weight as Edit and uses `alert()` / `prompt()`. | C, F |
| 6 | Flows in the base design are not shown: the completing-with-outstanding-records confirmation, the Records filter, contributor rendering, the empty state, and New record from a package. | B, D, G, H |
| 7 | In the editor, the package field sits between Title and Description. "New work package" is a full-size button, and the field is a native select although the base asks for a searchable one. Nothing says the assignment waits for the record save. | I |
| 8 | Package form labels touch the input above them. Empty and duplicate names share one message. Name search ignores accents only partly. | B, E |
| 9 | Overview shows Classification and Decision one value per line, and its section headings differ in size. Record details come after the decision. The issued instruction is not distinguished. The photo "+" sits about 800 px from its heading. Date formats are mixed. | J |
| 10 | On phones the record actions wrap, leaving Delete record next to Activity history, and the five-item menu wraps onto two lines. | A2, K |
| 11 | The amber focus ring competes with the amber statuses and the safety notice. Neutral tags almost vanish on the grey page. Purple verification is too close to blue in a bar chart. Safety relies on colour alone. Overdue has no colour. | L |

## 3. Changes

Each change has an ID, its requirements, and acceptance criteria. "Outstanding", "overdue", "past target" and "today" are defined in §M1.

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
2. **Identity line:** the label "Work package", the package status pill, and an info icon giving the status definition from base §7.
3. **Title:** the package name. Long Greek names wrap (`overflow-wrap: anywhere`).
4. **Actions:**
   - **Edit package** (primary);
   - **New record**, which opens the existing capture form with this package preselected (base §4);
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
  - The server does not block the change (base §2).
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

- Use one form for creating and editing; fields and validation follow base §4.
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
  - absent, "none" and a package ID must be distinguishable (base §6);
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
- **Contributor or shared reader:** plain text only. There is no link, and the projection carries no ID (base §6).
- Hidden while the record is being edited, like the rest of the identity line.
- *Accept when:* the contributor and shared views contain no package link and no package ID.

### I. Record editor: the Work package field

Blueprint: change map → *Editing a record*.

- **Position:** in the Work card, directly after Description and before Severity / Completion.
- **Label row:** "Work package", with a text button **+ New package** right next to the label, not at the far edge.
- **Control:** a single-choice picker. Build it on the searchable picker that base §3 introduces for Trades and Tags. Today's [TagPicker.tsx](../../src/web/record/TagPicker.tsx) is a different component.
  - The trigger shows the current choice and its status pill, or "No work package".
  - The panel contains:
    - a search box (`foldText`);
    - a radio group, with **No work package** first;
    - an **Active** group, then a **Completed or cancelled** group; each option shows its name and status pill;
    - when nothing matches: "No work package matches. Use + New package to create one."
  - Completed and Cancelled packages stay selectable (base §4).
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
  2. Record details: Priority, Severity, Completion, on one row as in the base;
  3. Classification (Quality Issue or Detail Clarification);
  4. Decision and instruction, including Options considered;
  5. Location and references, with the location photos.

  All section headings in the card use the same level and size.
- **J2 — Two columns** for short values; full width for long text. Render in this DOM order so the grid fills naturally, and do not use `grid-auto-flow: dense`. Empty values are still left out (base §3), and phones use one column.

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
- *Accept when:*
  - both languages render dates through `dateText`;
  - due chips follow the today boundary in §M1, tested at the date boundary;
  - the DOM order matches J2.

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

The agreed blue direction stays (base §3). These are the complete tokens for this change; the blueprint's **Colours** switch compares the agreed and adjusted versions.

**L1 — Base tokens (from base §3):**

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

The other record-status colours follow base §3:

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
| Outstanding | Any record status except Closed, Cancelled and Superseded; Draft counts (base §4) |
| Overdue | Outstanding and due date before today |
| Past target | Package target date before today and package status Planned, In progress or On hold |
| Today | The calendar date in **Europe/Athens** (approved; see §8) |

- *Today* comes from one helper in `src/domain`, used by the server (package totals) and the client (due chips). It is a fixed constant, not a setting, consistent with base §2.
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
  - Amber and green must not become adjacent.

## 4. Data and API implications

These are additions to base §5–§6. No new database columns are needed.

- **Package list response:** per-package `total`, `outstanding`, `overdue` and counts by status. Compute them in one grouped query at request time; there are no stored counters and no per-package queries.
- **Package detail response:** the same figures, plus counts by subtype and status for the table.
- **Records:** reuse the records endpoint with the package filter (§G) for both the package page and the Records list.
- **Record list items:** carry `workPackageId` (base §6). The client resolves names from the owner's package list, as it already does for people.
- **Delete conflict:** returns the current record count (base §4) for the blocked dialog (§F).
- **Confirmation in §D:** client-side only, using a fresh read. The server needs no confirmation flag.

## 5. Approved English and Greek wording

The owner approved the following wording on 2026-10-06 after reviewing the numbered list in chat. This replaces the earlier proposed Greek table. Row numbers match that review. N, M and K are counts; X and Y are names. Handle singular and plural forms separately. Retain the existing Record = Καταγραφή terminology. These translations are documentation only until implementation.

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

## 6. Unchanged and out of scope

- Base §9 exclusions remain.
- This amendment adds:
  - no database fields;
  - no package-level filters beyond name search;
  - no bulk reassignment;
  - no changes to print beyond base §6, which adds the package name;
  - no dark mode.
- Measurements, Log, evidence, sharing, status rules and deletion rules for records stay as in the base design and the v1 specification.

## 7. Verification

Extend the existing suites in [tests/browser](../../tests/browser) and [tests/domain](../../tests/domain). Run them in English and Greek, on desktop and at 360 / 390 px.

- **Domain:**
  - the today helper at the Athens midnight boundary;
  - outstanding, overdue and past-target rules;
  - totals across mixed subtypes and statuses, including Draft, Cancelled and Superseded.
- **Package list:**
  - active menu state;
  - counts and status bar text;
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

## 8. Owner decisions — accepted 2026-10-06

The owner accepted decisions 1–4 and 6, then approved the reviewed 76-row English/Greek list in §5. None of these six points remains open. This records approval of these decisions and wording; it does not by itself authorise application implementation or deployment.

1. **Today boundary:** Europe/Athens for record overdue dates and package target dates (§M1).
2. **Ready for verification colour:** plum, as specified in §L2.
3. **Records filter wording:** “All records, with or without a package”.
4. **Delete package:** always opens a dialog; populated packages show the explanatory blocked state (§F).
5. **Greek wording:** the revised, numbered English/Greek table in §5 is approved. It supersedes the earlier proposed translations.
6. **Package list order:** In progress, Planned, On hold, Completed, Cancelled; then by name using the current language's collation (§B).

## 9. Documents to update at delivery

- [docs/specs/v1.md](../specs/v1.md):
  - screens and navigation;
  - the Records filter;
  - the record header;
  - dates and overdue;
  - phone actions;
  - colours, where specified.
- [docs/guides/web-interface.md](../guides/web-interface.md).
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md): the "Proposed change" section.
- [docs/reference/data-model.md](../reference/data-model.md) (per the base design).
- The status of the base design and this amendment, following the documentation standard.

If no specification change is needed for an item, record that conclusion at closeout.
