import type { AttachmentCapabilities, PhotoOut } from './files';
import { z } from 'zod';
import { FileTimestamp } from './files';
import type { Subtype, Status, Severity, Priority, ProblemType, Stage, Disposition, Route, MeasurementPhase, Unit, VerificationMethod, VerificationOutcome } from './vocab';

export const ShareCreate = z.strictObject({ label: z.string().max(200).refine(value => value.trim() !== '', 'Required'), expiresAt: FileTimestamp.nullable().optional() });
export type ShareCreateInput = z.output<typeof ShareCreate>;
export interface ShareLinkOut {
  id: number; label: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastViewedAt: string | null; viewCount: number; url: string | null;
}

export interface SharedRecordFields {
  workPackageName: string | null;
  humanId: string;
  subtype: Subtype;
  status: Status;
  statusReason: { code: string | null; note: string | null } | null;
  title: string | null;
  description: string | null;
  publicNotes: string | null;
  locationNotes: string | null;
  reference: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  tradeIds: number[];
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: boolean;
  tagIds: number[];
  locationIds: number[];
  problemTypes: ProblemType[];
  stage: Stage | null;
  disposition: Disposition | null;
  correction: string | null;
  question: string | null;
  route: Route | null;
  issuedById: number | null;
  chosenOptionId: number | null;
  decidedById: number | null;
  decidedOn: string | null;
  instructionText: string | null;
  createdAt: string;
  updatedAt: string;
  mustBeDoneBefore: { humanId: string; title: string | null }[];
  requiresFirst: { humanId: string; title: string | null }[];
}

export interface SharedActivity {
  id: number;
  at: string;
  action: 'created' | 'status_changed' | 'field_changed';
  field: string | null;
  from: string | number | null;
  to: string | number | null;
  detail: {
    reasonCode?: string | null;
    reasonNote?: string | null;
    note?: string | null;
    verification?: { id: number; outcome: VerificationOutcome; method: VerificationMethod; checkedById: number; date: string };
    fromOption?: { label: string; description: string | null } | null;
    toOption?: { label: string; description: string | null } | null;
  } | null;
}

export interface SharedRecord {
  record: SharedRecordFields;
  options: { id: number; label: string; description: string | null }[];
  measurements: {
    id: number; date: string; measuredById: number | null; phase: MeasurementPhase; note: string | null;
    rows: { item: string; quantity: string; value: number; unit: Unit; note: string | null }[];
  }[];
  verifications: { id: number; checkedById: number; date: string; method: VerificationMethod; outcome: VerificationOutcome; note: string | null; createdAt: string }[];
  photos: PhotoOut[];
  attachments: {
    capabilities: AttachmentCapabilities;
    id: number; originalFilename: string; title: string | null; size: number; contentType: string; uploadedBy: string; uploadedAt: string;
    logEntry: { id: number; eventAt: string; text: string } | null;
  }[];
  log: { id: number; eventAt: string; text: string; loggedBy: string; attachmentIds: number[] }[];
  activity: SharedActivity[];
  labels: {
    people: { id: number; code: string; name: string; role: string }[];
    trades: { id: number; nameEn: string; nameEl: string }[];
    tags: { id: number; nameEn: string; nameEl: string }[];
    locations: { id: number; path: { id: number; nameEn: string; nameEl: string; kind: string; zoneTypeId: number | null }[] }[];
    zoneTypes: { id: number; nameEn: string; nameEl: string }[];
  };
}
