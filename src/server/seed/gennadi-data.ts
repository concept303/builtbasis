/**
 * Static seed data for Gennadi 822A (design §15). The source sheets are English only;
 * the Greek names of zone types, villas, levels and spaces are proposals the owner can rename in Lists.
 */
export const GENNADI_PROJECT = { code: 'cbg2401', name: 'Γεννάδι 822Α' } as const;

/** Ticking the root means the whole project, including Site and Off-site (design §15). */
export const PROJECT_ROOT = { nameEn: 'Gennadi 822A', nameEl: 'Γεννάδι 822Α' } as const;

export const VILLA_NAMES = [
  { nameEn: 'Villa 1', nameEl: 'Βίλα 1' },
  { nameEn: 'Villa 2', nameEl: 'Βίλα 2' },
  { nameEn: 'Villa 3', nameEl: 'Βίλα 3' },
] as const;

export const OTHER_TOP_LEVEL = [
  { nameEn: 'Site — shared infrastructure', nameEl: 'Κοινόχρηστες υποδομές' },
  { nameEn: 'Off-site — supplier fabrication', nameEl: 'Εκτός έργου' },
] as const;

export const ZONE_TYPES = [
  { key: 'living', nameEn: 'Living area', nameEl: 'Καθιστικό' },
  { key: 'kitchen', nameEn: 'Kitchen', nameEl: 'Κουζίνα' },
  { key: 'bedroom', nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο' },
  { key: 'bathroom', nameEn: 'Bathroom', nameEl: 'Μπάνιο' },
  { key: 'hall', nameEn: 'Hall', nameEl: 'Χολ' },
  { key: 'stairs', nameEn: 'Stairs', nameEl: 'Σκάλα' },
  { key: 'machine_store', nameEn: 'Machine / store room', nameEl: 'Μηχανοστάσιο / αποθήκη' },
  { key: 'balcony', nameEn: 'Balcony', nameEl: 'Μπαλκόνι' },
  { key: 'pergola', nameEn: 'Pergola', nameEl: 'Πέργκολα' },
  { key: 'terrace', nameEn: 'Terrace', nameEl: 'Ταράτσα' },
  { key: 'pool_area', nameEn: 'Pool area', nameEl: 'Χώρος πισίνας' },
  { key: 'garden', nameEn: 'Garden', nameEl: 'Κήπος' },
  { key: 'entrance', nameEn: 'Entrance', nameEl: 'Είσοδος' },
] as const;
export type ZoneKey = (typeof ZONE_TYPES)[number]['key'];

interface SpaceSeed {
  nameEn: string;
  nameEl: string;
  zone: ZoneKey;
}
interface LevelSeed {
  nameEn: string;
  nameEl: string;
  spaces: readonly SpaceSeed[];
}

/** One villa, from the Zone sheet of Project Fields Lookups.xlsx ("Level - Space" rows, 24 spaces). */
export const VILLA_LEVELS: readonly LevelSeed[] = [
  {
    nameEn: 'Basement',
    nameEl: 'Υπόγειο',
    spaces: [
      { nameEn: 'Machine / store room', nameEl: 'Μηχανοστάσιο / αποθήκη', zone: 'machine_store' },
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Stairs', nameEl: 'Σκάλα', zone: 'stairs' },
    ],
  },
  {
    nameEn: 'Ground',
    nameEl: 'Ισόγειο',
    spaces: [
      { nameEn: 'Living area', nameEl: 'Καθιστικό', zone: 'living' },
      { nameEn: 'Kitchen', nameEl: 'Κουζίνα', zone: 'kitchen' },
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Stairs', nameEl: 'Σκάλα', zone: 'stairs' },
    ],
  },
  {
    nameEn: 'Upper',
    nameEl: 'Όροφος',
    spaces: [
      { nameEn: 'Bedroom', nameEl: 'Υπνοδωμάτιο', zone: 'bedroom' },
      { nameEn: 'Bathroom', nameEl: 'Μπάνιο', zone: 'bathroom' },
      { nameEn: 'Hall', nameEl: 'Χολ', zone: 'hall' },
      { nameEn: 'Balcony', nameEl: 'Μπαλκόνι', zone: 'balcony' },
      { nameEn: 'Pergola', nameEl: 'Πέργκολα', zone: 'pergola' },
    ],
  },
  {
    nameEn: 'Roof',
    nameEl: 'Δώμα',
    spaces: [{ nameEn: 'Terrace', nameEl: 'Ταράτσα', zone: 'terrace' }],
  },
  {
    nameEn: 'External',
    nameEl: 'Εξωτερικός χώρος',
    spaces: [
      { nameEn: 'Pergola East', nameEl: 'Πέργκολα ανατολική', zone: 'pergola' },
      { nameEn: 'Pergola West', nameEl: 'Πέργκολα δυτική', zone: 'pergola' },
      { nameEn: 'Pergola South', nameEl: 'Πέργκολα νότια', zone: 'pergola' },
      { nameEn: 'Pergola Barbecue', nameEl: 'Πέργκολα μπάρμπεκιου', zone: 'pergola' },
      { nameEn: 'Pool area', nameEl: 'Χώρος πισίνας', zone: 'pool_area' },
      { nameEn: 'Garden', nameEl: 'Κήπος', zone: 'garden' },
      { nameEn: 'Entrance', nameEl: 'Είσοδος', zone: 'entrance' },
    ],
  },
];

/** The 25 thematic groups of the References CSV, as tags (design §15). */
export const TAGS: readonly { nameEl: string; nameEn: string }[] = [
  { nameEl: 'Πλακάκια - Μάρμαρα', nameEn: 'Tiles - Marble' },
  { nameEl: 'Φωτιστικά Σώματα', nameEn: 'Light fittings' },
  { nameEl: 'Είδη Υγιεινής', nameEn: 'Sanitaryware' },
  { nameEl: 'Ηλεκτρικές Συσκευές', nameEn: 'Electrical appliances' },
  { nameEl: 'Λοιπός Κινητός Εξοπλισμός', nameEn: 'Other movable equipment' },
  { nameEl: 'Internet - Συναγερμός', nameEn: 'Internet - Alarm' },
  { nameEl: 'Ξυλουργικά - Πάγκοι', nameEn: 'Carpentry - Worktops' },
  { nameEl: 'Υδραυλικά', nameEn: 'Plumbing' },
  { nameEl: 'Ηλεκτρολογικά', nameEn: 'Electrical' },
  { nameEl: 'Κλιματισμός A/C', nameEn: 'Air conditioning' },
  { nameEl: 'Μόνωση - Στεγάνωση', nameEn: 'Insulation - Waterproofing' },
  { nameEl: 'Πέτρα', nameEn: 'Stone' },
  { nameEl: 'Λοιπά Κατασκευαστικά', nameEn: 'Other construction' },
  { nameEl: 'Σκάλα', nameEn: 'Stairs' },
  { nameEl: 'Κουφώματα', nameEn: 'Windows and doors' },
  { nameEl: 'Γυάλινα Στηθαία', nameEn: 'Glass balustrades' },
  { nameEl: 'Πισίνα', nameEn: 'Pool' },
  { nameEl: 'Πέργκολες', nameEn: 'Pergolas' },
  { nameEl: 'Περίφραξη', nameEn: 'Fencing' },
  { nameEl: 'Ντεκ Πισίνας', nameEn: 'Pool deck' },
  { nameEl: 'Διαμόρφωση περιβάλλοντος χώρου', nameEn: 'Landscaping' },
  { nameEl: 'Λοιπός Εξωτερικός Χώρος', nameEn: 'Other external areas' },
  { nameEl: 'Γκαραζόπορτα', nameEn: 'Garage door' },
  { nameEl: 'Τελικές εργασίες και έλεγχοι', nameEn: 'Fit-out and checks' },
  { nameEl: 'Διαχείριση', nameEn: 'Management' },
];

/** Imported verbatim except these corrections (design §15). */
export const TRADE_OVERRIDES: Readonly<Record<string, { nameEl?: string }>> = {
  LVS: { nameEl: 'Ασθενή ρεύματα' },
};
