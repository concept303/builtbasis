import type { Lang } from '../../domain';
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details?: unknown) { super(code); }
}
// A transport failure or server failure does not prove that a write was rolled back.
export function isUnknownOutcome(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 507 && error.code === 'storage_capacity') return false;
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}
export interface ApiOptions { method?: string; body?: unknown; token?: string; signal?: AbortSignal }
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const method = options.method ?? 'GET';
  const body = options.body ?? (['GET', 'HEAD'].includes(method) ? undefined : {});
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(path, { method: options.method ?? 'GET', headers,
    credentials: options.token ? 'omit' : 'same-origin', cache: 'no-store', signal: options.signal,
    body: body === undefined ? undefined : JSON.stringify(body) });
  const data: unknown = method === 'HEAD' || response.status === 204 ? undefined : await response.json().catch(() => {
    if (response.ok) throw new ApiError(0, 'response_unknown');
    return null;
  });
  if (!response.ok) {
    const problem = data as { error?: string; details?: unknown } | null;
    throw new ApiError(response.status, problem?.error ?? 'request_failed', problem?.details);
  }
  return data as T;
}
const messages: Record<string, [string, string]> = {
  work_package_not_found: ['This work package is no longer available. Refresh the package choices.', 'Το πακέτο εργασιών δεν είναι πλέον διαθέσιμο. Ανανεώστε τις επιλογές πακέτων.'],
  work_package_not_empty: ['The package contains records and cannot be deleted.', 'Το πακέτο περιέχει καταγραφές και δεν μπορεί να διαγραφεί.'],
  work_package_confirmation_mismatch: ['The package name changed. Check the current name and confirm again.', 'Το όνομα του πακέτου άλλαξε. Ελέγξτε το τρέχον όνομα και επιβεβαιώστε ξανά.'],

  photo_conversion_failed: ['This photo could not be prepared. Upload the original as an attachment instead.', 'Η φωτογραφία δεν ήταν δυνατό να προετοιμαστεί. Μεταφορτώστε το πρωτότυπο ως συνημμένο.'],
  rule_violation: ['Complete the required record fields before saving.', 'Συμπληρώστε τα απαιτούμενα πεδία της εγγραφής πριν την αποθήκευση.'],
  duplicate_measurement_rows: ['Each item, quantity and unit combination must appear only once in a measurement set. Check for labels that differ only by spaces or letter case.', 'Κάθε συνδυασμός αντικειμένου, μεγέθους και μονάδας πρέπει να εμφανίζεται μόνο μία φορά στο σύνολο. Ελέγξτε ονομασίες που διαφέρουν μόνο σε κενά ή πεζά και κεφαλαία.'],
  invalid_credentials: ['Username or password is incorrect.', 'Λανθασμένο όνομα χρήστη ή συνθηματικό.'],
  too_many_attempts: ['Too many attempts. Try again shortly.', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
  unauthenticated: ['Your session ended. Sign in again.', 'Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.'],
  invalid_input: ['Check the entered values. Your changes have not been saved.', 'Ελέγξτε τις τιμές. Οι αλλαγές σας δεν αποθηκεύτηκαν.'],
  record_invalid: ['Complete the required fields before saving.', 'Συμπληρώστε τα απαιτούμενα πεδία πριν την αποθήκευση.'],
  transition_rejected: ['This status change is not allowed. Check the required fields.', 'Η αλλαγή κατάστασης δεν επιτρέπεται. Ελέγξτε τα απαιτούμενα πεδία.'],
  upload_too_large: ['The complete upload exceeds 100 MB, including metadata and photo copies.', 'Η συνολική μεταφόρτωση υπερβαίνει τα 100 MB, μαζί με τα μεταδεδομένα και τα αντίγραφα φωτογραφίας.'],
  storage_capacity: ['Storage is full or unavailable. Contact the owner.', 'Ο χώρος αποθήκευσης είναι πλήρης ή μη διαθέσιμος. Επικοινωνήστε με τον ιδιοκτήτη.'],
  unsupported_file_type: ['This file could not be accepted in this format.', 'Το αρχείο δεν έγινε αποδεκτό σε αυτή τη μορφή.'],
  permission_denied: ['You do not have permission for this action.', 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.'],
  owner_required: ['This action is available only to the owner.', 'Αυτή η ενέργεια επιτρέπεται μόνο στον ιδιοκτήτη.'],
};
const ruleMessages: Record<string, [string, string]> = {
  'required:title': ['Enter a title.', 'Συμπληρώστε τίτλο.'],
  'required:problemTypes': ['Select at least one problem type.', 'Επιλέξτε τουλάχιστον έναν τύπο προβλήματος.'],
  'required:question': ['Enter the question.', 'Συμπληρώστε το ερώτημα.'],
  disposition_required: ['Select a disposition.', 'Επιλέξτε τρόπο αντιμετώπισης.'],
  decision_required: ['Record who decided and the decision date.', 'Συμπληρώστε ποιος αποφάσισε και την ημερομηνία απόφασης.'],
  accept_as_is_required: ['Closing without verification requires Accept as is.', 'Το κλείσιμο χωρίς επαλήθευση απαιτεί Αποδοχή ως έχει.'],
  transition_not_allowed: ['This status transition is unavailable.', 'Αυτή η αλλαγή κατάστασης δεν είναι διαθέσιμη.'],
  reason_required: ['Choose a reason.', 'Επιλέξτε αιτιολογία.'],
  reason_invalid: ['Choose a reason from the list.', 'Επιλέξτε αιτιολογία από τη λίστα.'],
  reason_note_required: ['Add a note explaining the reason.', 'Προσθέστε σημείωση που εξηγεί την αιτιολογία.'],
  note_required: ['Add a transition note. For supersession, name the replacement record.', 'Προσθέστε σημείωση αλλαγής. Για αντικατάσταση, αναφέρετε τη νέα εγγραφή.'],
  verification_required: ['Complete the checked-by person, date and verification method.', 'Συμπληρώστε ποιος έλεγξε, την ημερομηνία και τη μέθοδο επαλήθευσης.'],
};
export function errorText(error: unknown, lang: Lang): string {
  if (error instanceof ApiError && error.details && typeof error.details === 'object' && 'errors' in error.details && Array.isArray(error.details.errors)) {
    const translated = error.details.errors.filter((code): code is string => typeof code === 'string').map(code => ruleMessages[code]?.[lang === 'en' ? 0 : 1]).filter(Boolean);
    if (translated.length) return translated.join(' ');
  }
  const message = error instanceof ApiError ? messages[error.code] : undefined;
  if (message) return message[lang === 'en' ? 0 : 1];
  if (error instanceof ApiError && [403, 404].includes(error.status)) return lang === 'en' ? 'This item is not available.' : 'Το στοιχείο δεν είναι διαθέσιμο.';
  return lang === 'en' ? 'The request could not be completed. Your unsaved input is still here. Refresh before retrying a creation or upload.' : 'Το αίτημα δεν ολοκληρώθηκε. Οι μη αποθηκευμένες τιμές διατηρούνται. Ανανεώστε πριν επαναλάβετε δημιουργία ή μεταφόρτωση.';
}
