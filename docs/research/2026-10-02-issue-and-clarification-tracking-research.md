> **Document type:** Research (non-authoritative input)
> **Source:** Deep-research report commissioned 2026-10-02 for BuiltBasis; imported verbatim from `E:\Construction Issue and Pre-Build Detail Clarification Tracking for an Owner-Built Platform.md`.
> **Note:** `cite…` markers are citation artifacts of the source tool. Where this report and `docs/designs/2026-10-02-v1-records-design.md` differ, the design governs.

# Construction Issue and Pre-Build Detail Clarification Tracking for an Owner-Built Platform

## Executive conclusion

The research supports the core idea behind your prototype, but with an important refinement:

**Do not build two siloed modules, and do not build one completely generic “issue” object either.** Build one common **Project Record** backbone with a mandatory `kind` discriminator—`Quality Issue` or `Detail Clarification`—and give each kind its own classification fields and lifecycle. The UI can still be one record page, with shared location, element, evidence, discussion, drawings, dates, responsibility, and links.

That recommendation is consistent with what the market reveals. Procore, Autodesk Build, Fieldwire, BuildPass and Aconex mostly separate defects, RFIs, submittals, instructions and inspections into modules, then add links between them. PlanRadar and Dalux move closer to a configurable common-record model: PlanRadar uses highly configurable Tickets, while Dalux routes several quality and RFI processes through Tasks/workflows. BCF goes further conceptually: a generic **Topic** is the collaboration object, with type/status/assignment/comments/viewpoints/document references and explicit topic-to-topic relationships. citeturn21search1turn19search4turn21search7turn16view2turn16view0turn20search7turn5search0

Your first hypothesis—**commercial platforms largely lack first-class structured measurements inside an issue**—survives, with qualifications. PlanRadar has Number and Decimal custom fields; Autodesk RFIs have numeric custom fields; Fieldwire has custom task attributes; Dalux has configurable checklists and inspection/test plans; and BIM-oriented products provide geometric measurement tools. Those mechanisms can store or display measurements, but in the official documentation reviewed I found **no mainstream product that models a repeatable set of measurements against individual physical sub-elements, derives comparisons/tolerances from them, and uses the result to support the disposition decision** in the manner of your jamb example. citeturn16view0turn19search0turn21search0turn20search8turn16view2

That is not a small distinction. Your W6 example is not merely:

> “Stone unequal left/right — rectify.”

It is closer to a little engineering evidence model:

`Left jamb → stone 21.5 cm; total depth 61.5 cm`  
`Right jamb → stone 15.3 cm; total depth 57.8 cm`  
`Total-depth difference → 3.7 cm`  
`Therefore grinding can align the white reveal but cannot simultaneously make exposed stone equal`  
`Therefore proposed disposition → demolish/rebuild rather than grind`

Most construction issue systems are designed around **observation → person → due date → photo → status**. Your model adds **observation → quantified condition → requirement → decision logic → disposition → verification measurement**.

Your second hypothesis—**the preventive detail and the later defect are poorly joined in most platforms**—is also substantially correct, although Autodesk, Procore, Fieldwire and Aconex have stronger cross-linking than the brief initially gave them credit for. Autodesk Build is especially strong at references: an RFI can reference files, sheets, photos, submittals, issues, schedule items, assets, potential change orders, forms and other RFIs, while submittals similarly cross-reference Issues, RFIs and other project objects. Procore has generic Related Items and can create an Instruction, Correspondence item or change event from an RFI. Fieldwire explicitly links RFIs with Tasks, Specifications and Change Orders. Aconex design issues can spawn an RFI/project mail and maintain the relationship back to the issue. citeturn19search4turn19search9turn21search1turn21search12turn21search7turn16view2

What I did **not** find documented in those products is the stronger semantic chain you are proposing:

**approved location-specific detail → becomes the requirement baseline → built condition is measured against it → deviation creates a linked nonconformance → correction is remeasured → the same baseline and acknowledgment remain evidence for the commercial position.**

That should be the product's organizing idea.

A second important correction concerns ISO terminology. As of **September 16, 2026, ISO 9001:2026 is the current edition**, replacing ISO 9001:2015. ISO 9000:2026 supplies the current quality vocabulary. ISO's vocabulary distinguishes a **correction**, which deals with a detected nonconformity, from **corrective action**, which removes the cause so that the problem does not recur. Your proposed field currently called “Corrective action” for “who fixes this item and how” should therefore normally be called **Correction / Rectification**. Reserve `Corrective Action` for root-cause/systemic action such as revising the stone-opening procedure, creating a compulsory mock-up, or introducing a hold point for every opening. citeturn17search5turn17search7turn18search0

That difference is directly useful in Rhodes:

- **Correction:** demolish and rebuild W6-left so that the finished geometry satisfies the approved detail.
- **Corrective action:** require an approved opening-detail benchmark and measurement check before any remaining stone opening is installed.

That is much cleaner quality language than treating “corrective action” as simply the contractor's punch-list task.

## Terminology and standards

### The two concepts should not both be called “issues”

For the owner-facing product I would use:

| Domain concept | Recommended English UI term | Recommended Greek UI term | Notes |
|---|---|---|---|
| Top-level record kind after work exists and something is wrong | **Quality Issue** | **Ζήτημα ποιότητας** | Neutral umbrella; then classify what kind of quality issue it is. |
| Formal requirement deviation | **Nonconformance** | **Μη συμμόρφωση** | Use `NCR / Αναφορά μη συμμόρφωσης` where a formal NCR process is intended. |
| Defective condition/workmanship | **Defect / Deficiency** | **Ελάττωμα / κακοτεχνία** | “Ελάττωμα” is the safer formal Greek term; Greek public-works legislation uses *ελαττώματα* for defective works and provides for rectification/demolition/reconstruction. citeturn7search2 |
| Close-out task/list terminology | **Punch item** (US), **snag** (UK), **defect item** (AU) | **Εκκρεμότητα / ελάττωμα προς αποκατάσταση** | Punch/snag is better treated as a stage/process flag, not as the technical nature of the defect. Procore itself localizes UK drawing links as “snag items,” illustrating the regional terminology. citeturn21search16 |
| Pre-build item requiring resolution | **Detail Clarification** | **Τεχνική διευκρίνιση / Διευκρίνιση λεπτομέρειας** | This should be your product umbrella. “RFI” is only one route through it. |
| Contractor asks designer | **RFI — Request for Information** | **Αίτημα πληροφοριών / αίτημα διευκρίνισης** | Widely understood international construction term. |
| Designer resolves detail without an RFI | **Designer/Architect's Instruction** | **Εντολή αρχιτέκτονα / έγγραφη εντολή μηχανικού** | Contract-specific terminology should be retained. |
| US AIA minor instruction/clarification mechanism | **ASI — Architect's Supplemental Instruction** | Keep `ASI` plus translated description | AIA's G710 ASI is for additional instructions or minor changes not changing Contract Sum or Contract Time; it should not be used as a generic label for every instruction. citeturn8search0turn8search3 |
| Contractor proposes how/product to build | **Submittal** | **Τεχνική υποβολή / υποβολή προς έγκριση** | Child types include shop drawing, product data, samples. |
| Fabrication/installation drawing | **Shop drawing** | **Κατασκευαστικό σχέδιο** | Usually a submittal. |
| Designer's localized detail | **Detail / sketch** | **Κατασκευαστική λεπτομέρεια / σκαρίφημα** | `SK` can remain a document numbering convention rather than a record kind. |
| Build one first | **Mock-up / benchmark / sample panel / first-of-kind** | **Δείγμα / δοκιμαστική κατασκευή / πρότυπο αναφοράς** | A benchmark becomes especially valuable when subsequently referenced as acceptance evidence. |
| Mandatory stop before continuing | **Hold point** | **Σημείο αναμονής / υποχρεωτικό σημείο ελέγχου** | Dalux explicitly defines its hold-point checklists as mandatory verification steps that must be approved before the process continues. citeturn20search0 |
| Inspection regime | **ITP — Inspection and Test Plan** | **Σχέδιο επιθεωρήσεων και δοκιμών** | Particularly common in formal QA infrastructure/Australasian practice; Dalux implements both inspection and test plans digitally. citeturn20search1turn20search12 |

The Greek translations other than the cited statutory `ελάττωμα` should be treated as **recommended bilingual product terminology**, not as evidence that every Greek contractor uses an identical formal vocabulary. On your own project, retain the actual site vocabulary alongside the formal terminology: `λαμπάδα`, `πρέκι`, `δόντι`, and `σενάζ` are much more useful to the people doing the work than forcing everything into abstract QA language.

### Your proposed distinction between nonconformance and defect needs loosening

The draft model says, approximately:

> Nonconformance = deviates from drawing/specification; defect/deficiency = built as specified but poorly.

That is too rigid.

ISO quality vocabulary anchors **nonconformity** to failure to fulfill a requirement. Poor workmanship can itself fail a workmanship or acceptance requirement; therefore a workmanship defect can also be a nonconformity. Conversely, “defect,” “deficiency,” “snag” and “punch” are used differently by contracts, countries and software vendors. ISO's vocabulary also recognizes that a successful **repair** does not necessarily restore full conformity to the original requirements, which is precisely why the distinction between rework, repair and concession matters. citeturn18search0turn18search1

A safer ontology is:

**Quality Issue**  
→ observable condition

**Requirement status**  
→ conforming / nonconforming / requirement uncertain

**Issue class**  
→ defect/deficiency / incomplete work / damage / other observation

**Formal NCR**  
→ yes/no, where the project requires an NCR process

**Stage**  
→ construction / pre-punch / punch-closeout / defects-liability-warranty

This allows an item to be simultaneously:

> defect = yes  
> nonconforming = yes  
> stage = pre-punch  
> formal NCR = yes

rather than making those concepts compete for one “Type” field.

Procore is a useful warning here. Its default Observation types put **Corrective Action, Deficiency, Non-conformant and Pre-punch** beside one another, but Procore explicitly says these descriptions are not fixed semantics and the types can be adapted to a company's glossary. In other words, a product taxonomy does not necessarily constitute a clean domain ontology. citeturn21search2

### Punch and snag are not just synonyms for defect

A punch list or snagging list can include an actual defect, damaged work, an omission, incomplete work, cleaning, labeling, missing sealant, documentation, or something else required before completion. It is therefore better to treat **punch/snag primarily as close-out workflow/stage**, with the underlying technical class held separately.

Your existing `pre-punch / punch / warranty` idea is consequently good as a **stage field**. Procore's “Pre-punch” Observation classification confirms the industry usage, but I would not reproduce Procore's mixing of stage and condition into a single type. citeturn21search2

### Disposition should be separate again

For an actual nonconformance, the decision about what happens to the physical work is a different question from what the defect is.

Recommended controlled values are:

`Undecided` → `Rework` → `Repair` → `Replace/Remove and rebuild` → `Accept under concession` → `Reject`

For your jambs:

- **grind to align the white reveal but retain unequal stone:** `Repair` or `Accept under concession`, depending on the approved outcome;
- **demolish/rebuild so the original geometry is achieved:** `Rework / Replace`;
- **leave the unequal completed result intentionally:** `Accept under concession`, not simply “realized deviation.”

I would therefore rename your current tracker category **realized deviation** in the system as an outcome/display view over records whose underlying data says:

> `requirement_status = nonconforming`  
> `disposition = accepted under concession`  
> `verification = accepted`  
> `physical correction = none or limited`

The key is that “too expensive to correct” does not itself turn a deviation into an accepted result. Someone with design/contract authority must make that decision.

### “Sequencing-critical” is related to, but not identical with, a hold point

This distinction matters.

A **dependency/constraint** means, for example:

> Tile grid must be resolved before tiling starts.

A **hold point** means:

> Tiling **may not proceed** until the specified person has inspected/reviewed the required evidence and formally releases the gate.

Dalux's implementation makes that distinction explicit: its hold-point checklists are mandatory verification stages whose approval is required before continuation. citeturn20search0

So preserve both:

`sequencing_constraint = yes/no`  
`blocks_activity = Basement tiling`  
`hold_point = yes/no`  
`release_authority = Architect`  
`release_status = Pending / Released / Rejected`

That will make your existing “evidence before cover” rule enforceable rather than merely advisory.

### BCF strongly supports a common backbone

buildingSMART describes BCF as an open standard for communicating model-based **issues and other topics** between BIM applications. In BCF 3.0, a Topic can have type/status, priority, labels, assignment, comments, viewpoints, document references and BIM snippets; the API also explicitly supports **related topics**. The specification does not dictate that a Topic must be a defect rather than an RFI-like coordination topic. citeturn4search2turn5search0

That is conceptually very close to what your core record should be:

> Topic / Record  
> + typed semantics  
> + location/model context  
> + evidence  
> + assignment  
> + discussion  
> + relationships.

But BCF deliberately does **not** solve your whole problem. It is weak or silent on commercial responsibility, contractual instruction authority, detailed submittal workflows, cost entitlement, structured field measurement series, hold-point release and your proposed clarification→requirement→verification chain. BCF should therefore influence the interoperability model, not determine the product UX.

## Platform comparison

The comparison below distinguishes **documented capability** from **inference/configuration**. “Clarification” means your broader pre-build concept, not merely the vendor's RFI module.

### Procore

**Built-work issue model.** Procore has at least two relevant quality pathways: **Observations** and the **Punch List/Defect List/Snag List** family of tools. Its default quality Observation types include Corrective Action, Deficiency, Non-conformant and Pre-punch. Observation records carry fields such as location, assignee, due date, priority, specification section and status; the platform's multi-tier location system can be attached to RFIs, submittals and other records as well. citeturn21search2turn1search1turn21search6

Its Observation workflow includes states such as Initiated, Ready for Review, Not Accepted and Closed. In punch/defect workflows, the assignee can mark work ready for review while the manager/final approver performs the closing action, giving Procore a useful distinction between **“contractor says fixed” and “authorized person verified it.”** citeturn1search3turn1search15

Photos, attachments, drawings and plan context are strong. Procore can link sketches, RFIs, documents, submittals, punch/snag items, observations, inspections and correspondence directly on drawings. citeturn21search8turn21search16

**Pre-build clarification.** Procore uses separate RFIs, Submittals, Inspections and Instructions/Correspondence tools. Its formal notion of **Ball in Court** means the person currently required to make a decision or response, and applies to workflows such as RFI and submittal processes. citeturn21search14

**Linkage.** This is stronger than a simplistic “separate silos” assessment suggests. Procore's Related Item is explicitly a link between Procore objects, including RFIs and Submittals. Its RFI workflow can also generate an Instruction, Correspondence item or commercial/change object. Drawing markups provide another common spatial hub. citeturn21search1turn21search12

**Assessment for your product.** Procore validates the need for formal RFI/instruction/submittal identity but also demonstrates why you should not copy its taxonomy wholesale. The Observation types mix condition, action and stage. Your orthogonal fields are cleaner.

### Autodesk Construction Cloud / Build

Autodesk's 2026 documentation now uses **Forma Build** branding for the product previously/currently known to many users as Autodesk Construction Cloud / Build. The underlying Build workflows are the relevant comparator here. citeturn19search16

**Built-work issue model.** Autodesk Issues support configurable categories/types, assignment, due dates, root cause and custom fields. Standard issue status values exposed in its import documentation include **Open, In Review, Pending and Closed**. Locations are a shared hierarchy covering areas, buildings, levels and rooms and can be referenced by Assets, Issues, Photos, Forms, RFIs and Submittals. citeturn19search6turn19search24

That shared location model is strategically important: unlike a defect list whose “location” is merely text, the same project location can become the meeting point for multiple workflows.

**Pre-build clarification.** Autodesk RFIs have a dedicated **Ball in court**, reviewers, RFI type and configurable fields. An RFI can reference Files, Sheets, Photos, Submittals, Issues, Schedule, Assets, potential change orders, Forms and other RFIs. Custom RFI fields may be multi-select, numeric, single-select or text. citeturn19search4turn19search0

A particularly useful external-party feature is that a non-project-member email address can be assigned to Ball in Court, Optional Reviewer or Watcher. Replies are captured in the RFI record; a reply from an external Ball-in-Court party becomes the official response and changes the RFI's status. That is directly relevant to your “Greek tradesperson without a heavyweight account” requirement. citeturn19search2

Submittals provide an even more formal review structure, including workflow stages, reviewers, comments/attachments and dates such as **Required Date, Required Approval Date, Required on Job Site Date and Lead Time**. Submittals can reference Assets, Files, Forms, Issues, PCOs, Photos, RFIs, other Submittals, Schedule and Sheets. citeturn19search9

Autodesk's mobile application explicitly supports downloaded projects for work offline or with limited connectivity. citeturn19search26

**Assessment.** Among the products reviewed, Autodesk comes closest to a richly interconnected graph of issue/RFI/submittal/location/asset/schedule evidence. What remains missing from the documented model is your semantic rule that a particular approved clarification is **the acceptance criterion for a physical element** and that subsequent measurements are evaluated against it.

### Fieldwire

**Built-work issue model.** Fieldwire's **Task** is deliberately broad. It is used for QA/QC, punch/deficiency work and other field coordination. Custom Task Attributes let administrators capture project-specific data beyond the standard task attributes. citeturn21search0turn21search3

Its status model is particularly attractive for field close-out because projects can maintain a progression built around **Open → Tracked → Verified**, with configurable status behavior and permissions. That naturally separates “work completed” from “work independently verified.” Fieldwire also supports plan-based task pins, photography, markups and reports. citeturn13search1turn13search9turn21search15

**Pre-build clarification.** Fieldwire also has dedicated RFIs and Submittals at the project-management tier rather than forcing everything into a Task. An RFI can be linked to an existing Specification, Task, RFI or Change Order, or a new linked Task/Change Order can be created from the RFI. citeturn21search7

**Field usability.** Fieldwire has web plus iOS/Android field applications, and its product design centers heavily on plan pins, tasks and phone/tablet capture. It has also introduced printable QR codes for tasks/plans, which validates your proposed PDF→QR→live-record interaction pattern. citeturn21search19turn13search14

**Assessment.** Fieldwire is a strong model for **simple site execution and verification**, and its RFI↔Task link is conceptually close to clarification↔issue. Its generic Task is still fundamentally a task/issue object rather than the structured measured-condition object you need.

### PlanRadar

PlanRadar is the strongest counter-example to the claim that commercial software necessarily requires separate modules for every construction record.

**Record model.** Its central **Ticket** is based on configurable Forms. Standard fields include Title, Assignee, Receiver, Due Date, Status, Priority, Progress and Parent Ticket. Its fixed status vocabulary is Open, In Progress, Resolved, Feedback, Closed and Rejected. Administrators can add custom and shared fields, including **Number and Decimal** fields specifically suitable for quantities or measurements. citeturn16view0

That means you could, for example, configure `Left stone`, `Right stone`, `Left total depth` and `Right total depth` numerically. This partially falsifies the strongest version of your “platforms only store text/photos” hypothesis.

However, this is not the same as your desired model. A collection of configured scalar fields is much less flexible than:

> measurement set → arbitrary element/side rows → parameter → value/unit → target/tolerance → derived comparison.

So PlanRadar demonstrates that **numeric capture exists**, not that the measured-decision problem is solved.

**Location and field context.** Tickets can have plan positions, GPS context, attachments, plan annotations and QR links. Its project/plan structure supports hierarchical layers/sub-layers, while plan folders can represent buildings, blocks and floors. citeturn15search1turn15search8

**Scheduling.** PlanRadar goes unusually far in attaching tickets to a schedule. Tickets can have start/end dates, duration, be attached to schedule phases and participate in dependencies; overdue items are identified from dates and status. citeturn15search2turn15search5turn15search10

**Offline.** Its native mobile apps can browse, create and edit synchronized tickets offline and upload changes when connectivity returns. By contrast, the web application requires connectivity. citeturn15search4turn15search25

**Clarification model.** A Detail Clarification could be implemented as another Ticket Form with fields, documents and approval workflow. This is **configuration rather than a dedicated contractual RFI ontology**. That is simultaneously PlanRadar's strength and weakness: it offers one configurable record language but places more responsibility on the customer to define process semantics.

**Assessment.** PlanRadar is probably the closest commercial analogue to the architecture I recommend for your MVP: **shared record engine + form/subtype behavior**. Your opportunity is to make the construction-quality semantics far more opinionated and useful out of the box.

### BuildPass

BuildPass reflects contemporary Australian terminology and a lighter-weight field UX.

**Built-work issue model.** Its dedicated **Defect** records support defect type, status, location, priority such as critical/major/minor, due date, assignee/person or company, file/image attachments and image annotation. Its documented close-out states include Resolved, Blocked and Cancelled. citeturn14search0turn14search11

Defect reports group records by location and include identifiers, locations, photos, status and assigned personnel. Assignment behavior differs for a company, admin user and worker; workers can receive SMS and see assigned items in the Worker App. citeturn14search9turn14search3

**Pre-build clarification.** BuildPass has separate RFIs, Drawings and Submittals. Its RFI workflow can be initiated from a drawing location, and its external RFI submission capability allows controlled external links for subcontractors, workers or architects. BuildPass markets Defects, RFIs, Submittals and Drawings as adjacent project-management functions rather than a single generic ticket. citeturn3search3turn3search15turn2search19

**Linkage.** I found clear documentation around drawing-pinned RFIs and the coexistence of these modules, but **I did not find documentation proving a first-class typed Defect → governing RFI/Submittal/Instruction relationship comparable with Autodesk's reference system**. Treat stronger linkage as unverified rather than assuming it does not exist.

**Assessment.** BuildPass is relevant to your Australian/product-commercialization angle because it demonstrates the demand for a simple phone-first quality experience. It is less convincing as a model for formal NCR/disposition/verification semantics.

### Dalux

Dalux is the most interesting comparator for your **preventive QA** concept.

**Built-work issue model.** Dalux Field uses configurable **Tasks** and workflows for quality issues and defects. A task can be created at a selected building/level/drawing position with information and files/photos. Status is not simply a global label: it depends on where the task sits in the workflow and who is viewing it, with states covering new/ongoing/reported-ready/approval/closed patterns. citeturn20search30turn20search11

**Pre-build clarification.** Dalux's own RFI guidance says RFIs are formal requests used to clarify specifications, resolve uncertainties and address potential problems before they escalate, and recommends implementing the process through work packages, workflows and Tasks. This means RFI and defect processes can share much more workflow infrastructure than in strongly module-siloed products. citeturn20search7

**Preventive quality is the standout feature.** Dalux has:

- Checklists for predefined quality controls. citeturn20search8
- Inspection Plans and Test Plans with defined inspection points and workflows. citeturn20search1turn20search12
- `OK / Not OK` inspection results, where `Not OK` can automatically lead into a task. citeturn20search13
- Planned inspection/test extent by location/frequency. citeturn20search16
- Formal hold-point checklists that must be approved before the process continues. citeturn20search0
- Dedicated handling of deviations arising from test plans. citeturn20search25turn20search31
- Offline preparation for tasks, drawings, checklists, inspection plans and test plans. citeturn20search2

This is substantially more sophisticated than a simple punch-list application.

**Assessment.** Dalux comes closest to closing the **prevention → inspection → deviation** loop. But its paradigm is primarily checklist/test-plan/workflow driven. Your differentiator remains attaching a **specific approved construction detail and quantitative acceptance model to a specific element instance**, then letting that requirement follow the element through build and close-out.

### Oracle Aconex

Aconex separates several concepts more formally than the lightweight field products.

**Built-work issue model.** Aconex Field Issues have unique issue numbers and audit trails, assignment and issue status. Current reporting terminology includes **Open, Closed, In Dispute and Ready to Inspect**, the last being a particularly useful explicit verification handoff state. Field permissions distinguish observers, assignees and administrative variants. citeturn14search22turn14search7

Field also separates Issues/Punchlists, Inspections, Test Plans and Observations through different roles and functions. citeturn14search7

**Pre-build clarification.** Aconex can manage an RFI through **Mail** or through a more structured **Workflow**. Its own implementation guidance describes Mail as flexible, supporting both Aconex users and non-users, while Workflows are templated/repeatable. Both can include response information and support real-time status/reporting. citeturn16view3

Its project correspondence model also has an explicit close-out concept: formal mail such as RFIs can be marked closed once its associated tasks are complete. citeturn14search18

**Linkage.** In the BIM/design-issue environment, Aconex can create an Aconex Mail item—an RFI, for example—directly from an issue, track the mail in the issue's Related Processes area, and include a link back from the mail to the issue register. This is an unusually clear documented bidirectional relationship. citeturn16view2

**Assessment.** Aconex is strongest where the communication itself needs to remain a formal project record. It is a useful model for your **instruction/acknowledgment/audit trail** requirements, but not the model to emulate for a very lean phone UX.

### Revizto

Revizto is the best comparator for a **unified BIM issue/coordination record**, rather than for contract administration.

**Issue model.** Revizto issues support type, assignee, title, deadline, priorities from Blocker through Critical/Major/Minor/Trivial, status, comments, attachments, markups and spatial metadata. Location/filter information can include level, room, space, area and zone. citeturn16view1

Issues can originate in 2D or 3D, carry a screenshot/viewpoint, have photo/custom-picture markups and be printed to PDF with comments, attachments and field histories. citeturn16view1

Revizto also supports custom issue types/status workflows and BCF-related workflows; an issue can be identified as imported from BCF. Its Procore integration can elevate an issue to a Procore RFI. citeturn16view1turn3search1

**Measured context.** BIM viewers—including Aconex's design environment and products such as Revizto—can support geometric measurement in the visual model context. That is useful evidence, but it is different from storing domain measurements such as “remaining stone,” “ground-off stone,” “new white depth,” measurement date and measurement side as structured rows whose relationships are calculated. Aconex, for example, documents measurements available in the model viewpoint but not as an issue-level repeatable measurement data model. citeturn16view2

**Assessment.** Revizto strongly validates the “one spatial topic with discussion and evidence” concept and BCF compatibility. It is weaker as a model for submittal, contractual instruction, acknowledgment, hold-point or back-charge workflows unless paired with another construction-management platform.

### BCF

BCF should be treated as an **interoperability layer**.

Its Topic is intentionally generic and can carry workflow metadata, assignment, priority, labels, comments, viewpoints and document references. It supports related Topics rather than assuming all issues are isolated. Current buildingSMART implementation listings include several BCF file/API versions, including BCF 3.0, although buildingSMART notes that implementation information is vendor-supplied. citeturn5search0turn4search5turn4search8

For your future schema, I would therefore retain:

- an immutable UUID in addition to your human-readable `QI-001` or `DC-001`;
- explicit `type`, `status`, `priority` and `assigned_to`;
- model/drawing/element references;
- viewpoints and comments as separate child objects;
- document references;
- typed record-to-record relations.

That would make a later BCF adapter much easier without forcing the MVP itself to be BIM-dependent.

### Comparative summary

| Platform | Built-work record | Pre-build record | Verification / “ball in court” | Linkage between the two | Fit to your measured-detail idea |
|---|---|---|---|---|---|
| **Procore** | Observations + Punch/Defect/Snag | RFI, Submittal, Instruction, Inspection | Explicit BIC; Ready for Review then authorized close | **Strong** generic Related Items and RFI-derived records | Low–moderate; conventional field data, not measurement-series centric. citeturn21search1turn21search14 |
| **Autodesk Build** | Issues | RFI + Submittal + Forms | Explicit BIC/reviewers; external email actor supported | **Very strong** cross-references among Issues/RFIs/Submittals/Assets/Schedule/etc. | Moderate via numeric/custom fields, but not your repeatable measurement model. citeturn19search0turn19search2turn19search9 |
| **Fieldwire** | Task | RFI + Submittal | Open/Tracked/Verified approach | **Strong** RFI↔Task/Spec/CO links | Moderate via custom task attributes; verification model is useful. citeturn21search0turn21search7 |
| **PlanRadar** | Configurable Ticket | Configurable Ticket + approval | Assignee/status/approvals | **Conceptually unified** because both can be forms over Tickets | Moderate–high configurability; numeric fields available, but no documented repeatable measurement reasoning. citeturn16view0 |
| **BuildPass** | Defect | RFI + Submittal | Assignment/status; worker/company routing | **Moderate / documentation incomplete** | Low for engineering measurements; good phone simplicity. citeturn14search0turn14search3 |
| **Dalux** | Task / deviation from inspection | RFI Task + approval + inspection/test/hold point | Workflow position, approvals, mandatory hold-point release | **Strong process linkage**, particularly inspection→Not OK→task | High fit to preventive QA, lower fit to your quantitative element model. citeturn20search0turn20search7turn20search13 |
| **Aconex** | Field Issue/Punchlist | RFI Mail/Workflow | Ready to Inspect; formal mail/task ownership | **Strong** design issue↔RFI/mail relationship | Low–moderate; formal audit/comms strength. citeturn14search22turn16view2 |
| **Revizto** | Unified BIM Issue | Can model clarification as issue/type; Procore RFI escalation | Assignee/deadline/custom workflows | **Strong issue context**, weaker native contractual process | Strong spatial context, weak structured field-measurement semantics. citeturn16view1 |
| **BCF** | Generic Topic | Generic Topic | `assigned_to`, status/type defined by implementation | **Native related Topics** | Excellent schema inspiration; no construction-specific measured decision model. citeturn5search0 |

## Recommended MVP model and lifecycle

### Use one backbone, with two real subtypes

The design decision should be:

**One `Record` backbone + `kind` + subtype-specific data/workflow.**

Not:

> one generic “Issue” table with hundreds of nullable fields

and not:

> independent Defect, RFI, Instruction, Submittal and Clarification applications with duplicated location/evidence logic.

Conceptually:

```text
Project Record
├── Quality Issue
└── Detail Clarification
```

Both inherit the common skeleton:

```text
identity
project
location
physical element(s)
current owner / ball in court
responsible organization
status
priority
dates
schedule constraint
discussion
evidence
drawings / documents
relationships
audit trail
```

The subtype then carries its proper semantics.

This takes the best architectural lesson from BCF's generic Topic, PlanRadar's configurable Ticket and Dalux's task/workflow system while avoiding Procore-style semantic mixing. citeturn5search0turn16view0turn20search7

### Core record

| Field | Recommended structure |
|---|---|
| `record_id` | Immutable UUID plus human ID such as `QI-B1-0047` / `DC-B2-0012` |
| `kind` | `quality_issue` / `detail_clarification` |
| `title` | Short field description |
| `description` | Narrative current situation/question |
| `project_id` | Project |
| `location_id` | Normalized location hierarchy |
| `element_ids[]` | One or more physical elements |
| `plan_reference` | Drawing/sheet + coordinates where relevant |
| `model_reference` | Optional BIM/IFC/BCF GUID later |
| `status` | Kind-specific lifecycle state |
| `ball_in_court` | Named person or role currently required to act |
| `responsible_org` | GC/subcontractor/design consultant/etc. |
| `created_by / created_at` | Audit |
| `due_at` | Action deadline |
| `required_before_at` | Clarification must be resolved before this date/activity |
| `priority` | Urgency—not the same as severity |
| `severity` | Consequence/impact |
| `constraint_type` | none / sequencing-critical / hold-point / before-cover |
| `blocked_activity` | Downstream work/trade |
| `visibility` | Project / restricted / invited parties |
| `tags` | Search/reporting only; do not use tags in place of first-class fields |
| `commercial_status` | Separate from physical/quality status |
| `created_source` | manual / imported tracker / field inspection / linked clarification etc. |

### Model the location and element separately

Your proposed hierarchy is right:

> Project → Building → Floor → Room/Space → Element

but the **element should not merely be the last textual location tier**.

For the jamb problem, model:

```text
Building 1
└── Ground floor
    └── Living room
        └── West balcony door [Opening W6]
            ├── Left jamb [W6-L]
            ├── Right jamb [W6-R]
            └── Lintel soffit
```

That matters because the quality record concerns the **opening**, while individual measurements and photographs concern the **jambs**.

This mirrors the useful distinction found in Autodesk between shared Locations and Assets: project information can attach to a location while specific objects can also have their own references. citeturn19search22turn19search24

Do not force every project to create this much granularity. Let the owner create elements only where the use case needs them.

### Make measurements a child entity, not custom fields

This is the most important data-model decision in the MVP.

Do **not** create database columns such as:

`left_stone_cm`  
`right_stone_cm`  
`old_white_left_cm`

That would solve one jamb problem and immediately fail on tiles, falls, stair clearances, waterproofing thickness, balustrades and future consultancy projects.

Instead:

**Measurement Set**

| Field | Example |
|---|---|
| captured_at | `2026-09-14` |
| captured_by | Owner |
| purpose | `as_built_verification` |
| method | tape measure |
| record | `QI-B1-...` |
| notes | remeasurement following partial rectification |

**Measurement Line**

| Element | Parameter | Value | Unit |
|---|---|---:|---|
| W6-L | remaining stone | 21.5 | cm |
| W6-L | total depth | 61.5 | cm |
| W6-R | remaining stone | 15.3 | cm |
| W6-R | total depth | 57.8 | cm |

Add optional:

`target`  
`minimum`  
`maximum`  
`tolerance`  
`requirement_reference`  
`photo_reference`  
`measurement_point`  
`supersedes_measurement`

Then store **derived findings** separately:

```text
stone_difference = 6.2 cm
total_depth_difference = 3.7 cm
```

and a human-reviewed conclusion:

> Grinding can align the reveal face but cannot produce equal visible stone because the jamb total depths differ.

The application may calculate differences automatically, but **the designer's disposition should remain an explicit human decision**, not an opaque algorithmic outcome.

This gives you a reusable engine for:

- jamb thicknesses;
- stair clear width;
- tile-setting offsets;
- waterproofing upstands;
- slab/floor levels;
- balustrade spacing;
- tolerances;
- falls and gradients;
- door/window openings;
- service penetrations;
- stone module dimensions.

PlanRadar and Autodesk demonstrate that numeric custom fields are commercially useful, but their documented scalar-custom-field approaches also illustrate why a repeatable measurement-child entity is a more durable domain model. citeturn16view0turn19search0

### Quality Issue subtype

I recommend these controlled facets.

| Facet | Recommended values / structure |
|---|---|
| `issue_class` | nonconformance / defect-deficiency / incomplete work / damage / observation |
| `formal_ncr` | yes/no + NCR number |
| `stage` | construction / pre-punch / punch-closeout / defects-liability-warranty |
| `requirement_status` | nonconforming / uncertain / accepted |
| `requirement_refs[]` | drawing, specification, approved clarification, submittal, mock-up, contract requirement |
| `observed_condition` | narrative |
| `acceptance_criteria` | structured/text criteria |
| `disposition` | undecided / rework / repair / replace / accept under concession / reject |
| `decision_authority` | architect/engineer/owner/other contractual role |
| `correction_required` | physical work required |
| `root_cause` | optional, normally after recurring/systemic issue |
| `corrective_action` | optional systemic prevention action |
| `verification_method` | visual / measurement / test / document / combination |
| `verification_result` | pending / pass / fail / accepted under concession |
| `verified_by / at` | evidence |
| `commercial_responsibility` | TBD / contractor / owner / designer / shared |
| `commercial_basis` | linked evidence/contract clause/decision |
| `commercial_status` | not assessed / notified / agreed / disputed / settled |

The explicit `requirement_refs[]` is critical. An NCR should be able to say:

> **Requirement:** DC-014 rev 2, architect's approved opening detail dated 2026-03-18  
> **Deviation:** W6-L as built does not match approved line and symmetric visible stone requirement.

That is far more useful than merely tagging it “Non-conformance.”

### Detail Clarification subtype

Do **not** force the user's concept to be called RFI. “Detail Clarification” should be the umbrella, with a `route` describing the industry mechanism.

| Field | Values / meaning |
|---|---|
| `clarification_route` | RFI / designer clarification / architect-site instruction / technical submittal / mock-up-benchmark / ITP-hold-point |
| `question_or_risk` | What is unclear or needs fixing before construction |
| `initiated_by` | Owner / contractor / architect / subcontractor |
| `required_for_elements[]` | Exact physical element(s) |
| `required_before_activity` | e.g. basement tiling |
| `options[]` | alternatives discussed |
| `selected_option` | chosen solution |
| `decision_authority` | architect/engineer/owner under contract |
| `decision_at` | timestamp |
| `detail_document_revision` | approved sketch/drawing |
| `instruction_text` | final instruction issued for construction |
| `instruction_at` | date |
| `acknowledged_by / at` | contractor acknowledgment |
| `mockup_required` | yes/no |
| `acceptance_criteria` | what “correct” will mean once built |
| `hold_point` | yes/no |
| `release_requirements` | evidence/inspection needed |
| `released_by / at` | formal gate |
| `supersedes_record` | prior detail if revised |

For your examples:

**Basement tile adhesive**

> Detail Clarification → route `technical submittal/designer clarification` → product selected → product data attached → architect approved → contractor acknowledged → released for tiling.

**Tile set-out**

> Detail Clarification → route `designer clarification` → building-specific plan/sketch attached → B1/B2 mirror relationship recorded → contractor acknowledgment → hold point before first tile → photo/measurement verification.

**Basement stair width vs balustrade**

> Detail Clarification → question + measured existing opening → balustrade detail/sketch → clearance decision → instruction → acknowledgment → future verification measurement.

**Stone opening benchmark**

> Detail Clarification → approved detail + one mock-up opening → measured acceptance criteria → architect approves benchmark → all subsequent openings reference it.

That last one is the preventive counterpart to your current NCR and is the strongest demonstration of the product thesis.

### Use a first-class Decision object

Do not bury the designer's alternatives and decision in a comments thread.

For the jamb:

```text
Option A: Grind
Outcome:
- aligns white jamb/soffit
- leaves unequal stone
- lower cost

Option B: Demolish and rebuild
Outcome:
- aligns white jamb/soffit
- restores required exposed-stone equality
- higher rework cost

Decision:
Option B

Authority:
Architect

Basis:
measurement set 2026-09-14 + approved requirement
```

That decision record should remain immutable once formally issued; later revisions should create a new revision/event.

This is especially important when the cheaper alternative is proposed by the contractor but rejected by the architect. A discussion thread alone cannot reliably distinguish **proposal** from **instruction**.

### Relationships should be typed

Avoid a generic “related items” bucket as the only connection.

A small controlled relationship vocabulary will create much more value:

`defines_requirement_for`  
`clarifies`  
`governs_element`  
`deviates_from`  
`supersedes`  
`resulted_in`  
`verified_by`  
`blocks`  
`depends_on`  
`supports_commercial_position`  
`related_to`

The resulting chain can be:

```text
DC-012 Opening detail
    defines_requirement_for
Element W6

QI-047 W6 stone/reveal nonconformance
    deviates_from
DC-012

Measurement set 2026-09-14
    verifies / quantifies
QI-047

Architect instruction rev 3
    directs_correction_of
QI-047

Final measurement
    verifies
QI-047
```

BCF's explicit Related Topics mechanism gives useful open-standard precedent for maintaining relationships rather than flattening everything into comments. citeturn5search0

### Keep quality closure and cost settlement separate

I would change your proposed lifecycle:

> Detect → Classify → Decide → Instruct → Correct → Verify → Close → Settle cost

to two parallel tracks after the decision.

**Physical/quality track**

> Detected → Triaged → Awaiting disposition → Correction instructed → In correction → Ready for verification → Verified/Closed

with failure loop:

> Ready for verification → Not accepted → In correction

and concession branch:

> Awaiting disposition → Concession proposed → Authorized/Rejected → Closed or correction required

**Commercial track**

> Not assessed → Responsibility proposed → Notice issued → Agreed / Disputed → Settled

This prevents a technically completed jamb remaining “open” for six months because a back-charge is disputed.

It also avoids the opposite problem: a commercial agreement should not close an unverified physical defect.

### Detail Clarification lifecycle

Recommended:

> **Raised → Under discussion → Detail in preparation → Awaiting decision → Issued for construction → Acknowledged → Hold point pending → Released / Verified → Closed**

Not every clarification needs every step. A simple tile adhesive decision may skip `Detail in preparation`; a complex stair/balustrade interface may need drawings and alternatives.

A clarification that is superseded should become:

> `Superseded`

not “Closed,” because future users need to know that it is no longer the governing requirement.

Once construction occurs, **do not convert the clarification into a defect**. Preserve it and create a linked Quality Issue if the work deviates. That is essential to the audit/evidence chain.

### Your existing tracker maps cleanly

| Existing category | Recommended treatment |
|---|---|
| **construction-critical** | `severity/impact` flag, not record type |
| **sequencing-critical** | `schedule_constraint` plus `blocked_activity`; use true `hold_point` only where proceeding is prohibited |
| **realized deviation** | Quality Issue → nonconforming → disposition `accept under concession` |
| **open coordination issue** | Usually Detail Clarification while pre-build; generic coordination record only if not tied to a build decision |
| **budget variance** | Commercial/cost record or linked cost impact, not quality classification |

The result lets your existing ~200-row tracker migrate without making its historical categories permanent architectural constraints.

## Delivery recommendation

### Build a responsive web application as a PWA from the start

For this project I would **not** begin with separate native iOS and Android applications.

The fastest credible path is:

**one responsive web application on the owner's domain, implemented with the application structure needed to operate as an installable PWA, with a deliberately small offline feature set.**

That is a more precise recommendation than simply “responsive website.”

Why? The commercial leaders consistently invest in native field applications because site work requires camera access, local project data and offline operation. Autodesk explicitly downloads projects to iOS/Android for offline/limited-connectivity work; PlanRadar's mobile apps allow offline ticket creation/editing while its web app requires connectivity; Dalux lets users prepare tasks, drawings, models, checklists and inspection/test plans for offline use. citeturn19search26turn15search4turn15search25turn20search2

That is a strong signal that **offline field operation is a genuine problem, not a nice-to-have**.

But your scope is radically smaller than Autodesk or Dalux. You do not initially need to synchronize thousands of BIM objects and complete project document sets. You need to handle:

- a few hundred records;
- phone photography;
- drawings/PDFs;
- comments and acknowledgments;
- structured measurements;
- a location tree;
- generated PDFs.

That makes a PWA economically sensible.

### Delivery options

| Option | Speed | Site/offline suitability | White-label suitability | Recommendation |
|---|---|---|---|---|
| **Responsive web only** | Fastest | Weak if signal disappears during capture | Excellent | Too fragile as the final field solution, but acceptable for earliest internal alpha. |
| **Responsive PWA** | Fast | Good if offline behavior is deliberately scoped and tested | Excellent | **Recommended MVP architecture.** |
| **Native iOS + Android** | Slowest / highest maintenance | Best potential field integration | Excellent | Defer until real use proves PWA inadequate. |
| **Low-code application** | Very fast for CRUD/forms | Platform-dependent; offline/media often constrains design | Variable | Useful for prototype/admin back office, but I would not base the consultancy product on it without proving the hard parts first. |

The hard parts in your product are not “create a form with Title and Due Date.” Every mature platform already does that.

The hard parts are:

1. the jamb-style structured measurement and visualization;
2. reliable field-photo capture/synchronization;
3. typed clarification→requirement→issue relationships;
4. revision-safe evidence and acknowledgment;
5. a strong A3 field PDF;
6. bilingual site UX;
7. white-labeled restricted sharing.

Those are exactly where a generic low-code environment is most likely to force compromises. That assessment is an **engineering/product inference**, not a documented limitation of a particular low-code vendor.

### The offline MVP should be narrower than a native platform

Do not try to replicate Autodesk/Dalux offline synchronization in version one.

A credible first field-offline scope is:

> open previously viewed record → enter measurements/text → take photos → mark them “pending upload” → queue submission → synchronize when online.

The user must always see whether something is:

`Saved on device`  
`Uploading`  
`Synced`  
`Failed — retry`

Photos are the biggest risk. Never allow a contractor to think photographic evidence has reached the server when it is only sitting locally.

Downloading whole projects, complex merge/conflict resolution and full offline document libraries can come later.

### Use a phone UX designed for Greek site personnel, not a desktop form squeezed onto mobile

For a subcontractor, the page should initially show only:

> **What is this?**  
> **Where is it?**  
> **What must I do?**  
> **By when?**  
> **Open drawing/photo**  
> **Acknowledge**  
> **Upload completion photo**  
> **Mark ready for inspection**

The owner and architect can see classification, measurements, design references, commercial fields and history.

This is exactly why role-based field interfaces matter. PlanRadar, for example, restricts subcontractors largely to their assigned tickets and allows them to update the relevant execution fields rather than exposing the full administrative interface. citeturn15search7

### External parties should not need a conventional account for every interaction

For your product, support two modes:

**Named project users** for owner, architect and main contractor.

**Scoped guest action links** for subcontractors or occasional consultants.

A guest link might permit only:

> View DC-019 → download sketch → acknowledge receipt → add comment/photo.

or:

> View QI-047 → see required correction → add completion photos → mark Ready for verification.

This is commercially credible: Autodesk already allows nonmembers to participate in RFI workflows by email, and Aconex Mail supports both users and non-users. BuildPass likewise documents external RFI submission mechanisms. citeturn19search2turn16view3turn3search3

However, **do not make acknowledgement anonymous**. Store:

`actor name`  
`organization`  
`authenticated email/phone`  
`timestamp`  
`record revision acknowledged`  
`action`

Also distinguish:

> “Acknowledged receipt”

from

> “Agreed responsibility/liability.”

Those are not the same legal/commercial statement.

### The A3 PDF plus QR concept is excellent

Keep it.

The PDF should not be a dumb export. It should be a **frozen evidence snapshot** of a specific revision of a record.

For a Quality Issue, an A3 landscape sheet can contain:

- record ID and status;
- hierarchy: Building → Floor → Room → Opening;
- plan snippet/pin;
- requirement/reference detail;
- before photograph;
- measurement diagram/bars;
- left-right deltas;
- architect's instructed correction;
- assignee and due date;
- current verification state;
- after photograph once available;
- QR to the live page;
- generated timestamp and revision.

For a Detail Clarification:

- question/risk;
- location;
- sketch/detail;
- selected solution;
- instruction;
- acknowledged-by/date;
- hold-point status;
- QR to current live record.

Both Fieldwire and PlanRadar already support QR-oriented field access concepts, while PlanRadar and Revizto provide PDF reporting, so the general interaction pattern is proven even though your proposed branded A3 layout is more purpose-specific. citeturn13search14turn15search1turn16view1

The QR should resolve to the stable record URL, not directly to a generated PDF. The live page can then show the latest state while the printed sheet itself states the revision/date at which it was produced.

### Viber should be treated as a transport channel, not a system of record

Do not build Viber integration into the first MVP.

The useful flow is:

> Site page → Share → Viber → recipient receives branded summary/link

and:

> A3 PDF → QR → restricted live record.

The system of record remains your application. A Viber message merely transports a link or PDF.

That is safer than allowing technical decisions to remain trapped in chat history.

When a decision arrives through Viber in real life, the owner/architect should be able to record:

> Source: Viber  
> Decision text / screenshot attached  
> Formally recorded by: X  
> Date/time  
> Issued as instruction revision Y

### Bilingual implementation should separate data from labels

Store controlled values as language-neutral codes:

```text
nonconformity
rework
awaiting_verification
hold_point
```

Then present:

| Code | English | Greek |
|---|---|---|
| `nonconformity` | Nonconformance | Μη συμμόρφωση |
| `defect` | Defect | Ελάττωμα |
| `rework` | Rework | Επανεκτέλεση / επανακατασκευή |
| `clarification` | Detail clarification | Τεχνική διευκρίνιση |
| `instruction` | Instruction | Εντολή |
| `hold_point` | Hold point | Σημείο αναμονής / υποχρεωτικού ελέγχου |
| `ready_for_verification` | Ready for verification | Έτοιμο για επανέλεγχο |
| `accepted_under_concession` | Accepted under concession | Αποδοχή κατ’ εξαίρεση |

For contractual instructions, preserve the **original issued text**. A translated rendering can be stored alongside it, but translation should not silently overwrite what the architect actually issued.

### Keep AI invisible and optional

Your product does not need visible AI branding, and the primary workflows should work without AI.

AI can later help with:

- Greek/English drafting;
- converting a voice note into proposed record fields;
- reading an architect's annotated PDF into draft instructions;
- suggesting record links;
- comparing a new measurement with acceptance criteria;
- summarizing repeated defects.

But none of those should be authoritative without human confirmation.

This is also consistent with the market direction: vendors such as BuildPass and PlanRadar are adding voice/AI-assisted capture, but the durable product value remains the controlled record, assignment and evidence model rather than the AI interface itself. citeturn2search3turn15search1

## Gaps and differentiation

### The measured-decision hypothesis is substantially validated

A more defensible wording than “none support measurements” is:

> **The reviewed products support numeric custom fields, checklists, model measurements or configurable attributes, but I found no documented first-class issue model built around repeatable structured measurements per physical sub-element, derived comparisons/tolerances and a disposition decision based on those measurements.**

That formulation survives the evidence.

PlanRadar explicitly has Number and Decimal fields. Autodesk RFIs can carry numeric custom fields. Fieldwire allows project-specific Custom Task Attributes. Dalux can gather structured inspection/checklist information and trigger tasks when inspection points fail. BIM viewers can measure geometry. citeturn16view0turn19search0turn21search0turn20search13turn16view2

Your innovation is therefore **not “construction software that can store a number.”**

It is:

> **a quantitative condition model attached to the actual building element, with measurements before/after, acceptance logic and a traceable design decision.**

The jamb prototype is a genuinely strong first vertical because the reason for rebuilding becomes visible rather than argumentative.

A text-only issue says:

> “Left stone too thick.”

Your record can show:

> `Δ visible stone = +6.2 cm`  
> `Δ total jamb depth = +3.7 cm`  
> `white-line correction by grinding = feasible`  
> `equal-stone requirement by grinding = not feasible`

and then record:

> `Architect's disposition = rebuild`.

That is much harder to dispute later.

### The clarification-to-built-work loop is only partially solved by commercial systems

There are three broad market architectures.

**Separate modules plus links:** Procore, Autodesk, Fieldwire and Aconex. This is strongest for formal contractual processes. Autodesk has particularly broad reference capabilities; Procore has Related Items; Fieldwire has explicit RFI↔Task links; Aconex can link design issues and RFI mail. citeturn19search4turn19search9turn21search1turn21search7turn16view2

**Generic configurable field record:** PlanRadar. This reduces module boundaries but asks the customer to construct the semantics. citeturn16view0

**Workflow/task plus preventive quality controls:** Dalux. This does unusually well at RFI processes, inspections, test plans, deviations and mandatory hold points. citeturn20search7turn20search0turn20search13

**Generic model-coordination topic:** Revizto/BCF. Excellent spatial collaboration model, weaker contractual/preconstruction process semantics. citeturn16view1turn5search0

None of the official documentation reviewed presents the concept in the simple owner-centric way:

> **“What was agreed for this exact building element before we built it?”**

That should be the center of your Detail Clarification record.

### Your real differentiation is “requirement lineage”

The strongest product concept emerging from the research is not “better snagging.”

It is **requirement lineage down to the built element**.

For a future door opening:

```text
Opening W12
│
├── Original design
│
├── DC-021 Detail Clarification
│   ├── architect sketch rev 2
│   ├── mock-up photos
│   ├── acceptance measurements
│   ├── issued instruction
│   └── contractor acknowledgement
│
├── Before-cover inspection
│   └── measurement set
│
└── QI-063 Nonconformance, if required
    ├── deviation from DC-021
    ├── disposition
    ├── correction
    ├── verification measurement
    └── commercial responsibility
```

That achieves something much more useful than placing `RFI-43` and `Punch-92` in the same database.

It answers four questions instantly:

> What did we agree?  
> What was actually built?  
> How do we know it differs?  
> Who had been told what before the work was done?

That is precisely the evidence problem exposed by your stone openings.

### The platforms generally under-model the decision itself

Most systems are good at the ends of the workflow:

> problem → assign someone

or:

> question → answer RFI.

Your case demonstrates that the middle is important:

> original requirement  
> observed geometry  
> cheaper alternative  
> consequence of cheaper alternative  
> designer decision  
> formal instruction.

That deserves structured `Option` and `Decision` records.

The distinction becomes commercially important when the contractor says:

> “We proposed grinding and it would have fixed the visible line.”

Your evidence then shows:

> Yes, but the architect's requirement also called for equal exposed stone; the recorded measurements showed that grinding could not satisfy both conditions; the architect therefore selected rebuild.

That is much stronger than reconstructing the decision six months later from WhatsApp/Viber messages and annotated PDFs.

### “Evidence before cover” can become a product primitive

Your existing principle should become more than a tag.

A clarification or work item can specify:

```text
evidence_gate = before_cover
required_evidence:
- photo
- measurement
- architect/site verification
release_authority = architect
```

Status:

> `Cannot release downstream work until evidence complete`

Dalux's formal hold-point implementation shows that construction software can successfully enforce this kind of gate rather than merely logging it. citeturn20search0

For the villas, obvious uses include:

- waterproofing before screed/tile;
- concealed services before closing plasterboard;
- reinforcement before concrete;
- substrate/preparation before stone;
- tile setting-out before mass installation;
- first opening/mock-up before all stone openings;
- balustrade dimensions before manufacture.

That lets your preventive-clarification module expand naturally into QA without becoming a full enterprise QMS.

### Do not overbuild the MVP into a Procore competitor

For the first usable release, I would deliberately **exclude**:

- full document management;
- tendering;
- accounting;
- comprehensive change-order management;
- programme/Gantt authoring;
- BIM authoring/viewing;
- generic project correspondence;
- full ISO QMS administration;
- native apps;
- generalized workflow designers.

Those are mature-platform battles.

The smallest differentiated product is instead:

**Shared foundation**
- projects;
- hierarchical locations;
- physical elements;
- people/roles;
- evidence/files/photos;
- comments/activity;
- typed links;
- notifications;
- bilingual labels;
- A3 PDF + QR.

**Quality Issue**
- requirement;
- classification;
- structured measurements;
- disposition/decision;
- correction;
- verification;
- commercial responsibility.

**Detail Clarification**
- question/risk;
- options/discussion;
- sketch/drawing;
- decision;
- issued instruction;
- acknowledgment;
- acceptance criteria;
- hold point.

**One killer connection**
- `Quality Issue deviates from Detail Clarification DC-xxx`.

**One killer field feature**
- repeatable measurement rows + comparison visualization.

That is enough to prove the idea on the Rhodes jambs and the four live pre-build clarification cases.

### Final product position

The market is already very good at:

> “Find a problem, take a photo, pin it to a drawing, assign it, give it a due date, close it.”

Procore, Autodesk, Fieldwire, PlanRadar, BuildPass, Dalux, Aconex and Revizto all cover substantial parts of that workflow. citeturn21search2turn19search24turn21search0turn16view0turn14search0turn20search30turn14search22turn16view1

Building another generic snag-list application would therefore have little defensible value.

The stronger proposition is:

> **Define the construction detail before work. Make the decision and acceptance criteria explicit. Tie them to the exact location and element. Capture quantitative evidence of what was built. If it deviates, create a traceable nonconformance against that approved requirement. Verify the correction with the same evidence model. Preserve the complete chain for close-out and commercial responsibility.**

The jamb–lintel–stone case is almost an ideal demonstration: it exposes why text, photos and status alone are insufficient. The deciding fact is geometrical and quantitative. The future preventive process is equally clear: approve the detail or first-of-kind before replication, attach measurable acceptance criteria, obtain acknowledgment, then impose a hold point before proceeding.

That makes the recommended product architecture a **lightweight element-centric quality and detail-control system**, rather than a miniature generic construction-management suite.