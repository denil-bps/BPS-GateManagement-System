export type Role = 'ADMIN' | 'GATE_SYSTEM';

export type BPSSection = 'Senior' | 'Middle' | 'Junior';

export type BPSHouse =
  // Senior Section
  | 'Panini'
  | 'Patanjali'
  | 'Kanad'
  | 'Katyayan'
  | 'Vyas'
  // Middle Section
  | 'Gurunanak'
  | 'Mahavir'
  | 'Dayanand'
  | 'Buddha'
  | 'Vivekananda'
  | 'Vivekanand' // Alias for backward compatibility
  // Junior Section
  | 'Kumar'
  | 'Shishu Griha 1'
  | 'Bal'
  | 'Kishore';

export const SENIOR_HOUSES: BPSHouse[] = [
  'Panini',
  'Patanjali',
  'Kanad',
  'Katyayan',
  'Vyas',
];

export const MIDDLE_HOUSES: BPSHouse[] = [
  'Gurunanak',
  'Mahavir',
  'Dayanand',
  'Buddha',
  'Vivekananda',
];

export const JUNIOR_HOUSES: BPSHouse[] = [
  'Kumar',
  'Shishu Griha 1',
  'Bal',
  'Kishore',
];

export const ALL_HOUSES: BPSHouse[] = [
  ...SENIOR_HOUSES,
  ...MIDDLE_HOUSES,
  ...JUNIOR_HOUSES,
];

export interface HouseInfo {
  house: BPSHouse;
  code: string;
  fullName: string;
  section: BPSSection;
}

export const BPS_HOUSES_MAP: Record<string, HouseInfo> = {
  // Senior Section
  PAN: { house: 'Panini', code: 'PAN', fullName: 'Panini House', section: 'Senior' },
  PAT: { house: 'Patanjali', code: 'PAT', fullName: 'Patanjali House', section: 'Senior' },
  KAN: { house: 'Kanad', code: 'KAN', fullName: 'Kanad House', section: 'Senior' },
  KAT: { house: 'Katyayan', code: 'KAT', fullName: 'Katyayan House', section: 'Senior' },
  VYAS: { house: 'Vyas', code: 'VYAS', fullName: 'Vyas House', section: 'Senior' },

  // Middle Section (Current existing house is before hyphen e.g. GH-PAN -> GH)
  GH: { house: 'Gurunanak', code: 'GH', fullName: 'Gurunanak House', section: 'Middle' },
  MH: { house: 'Mahavir', code: 'MH', fullName: 'Mahavir House', section: 'Middle' },
  DH: { house: 'Dayanand', code: 'DH', fullName: 'Dayanand House', section: 'Middle' },
  BH: { house: 'Buddha', code: 'BH', fullName: 'Buddha House', section: 'Middle' },
  VH: { house: 'Vivekananda', code: 'VH', fullName: 'Vivekananda House', section: 'Middle' },

  // Junior Section
  KUMAR: { house: 'Kumar', code: 'KUMAR', fullName: 'Kumar House', section: 'Junior' },
  SG1: { house: 'Shishu Griha 1', code: 'SG1', fullName: 'Shishu Griha 1', section: 'Junior' },
  BAL: { house: 'Bal', code: 'BAL', fullName: 'Bal House', section: 'Junior' },
  KISHO: { house: 'Kishore', code: 'KISHO', fullName: 'Kishore House', section: 'Junior' },
};

/**
 * Robust resolver for student house input from Excel, CSV or manual input.
 * Handles abbreviations (PAN, PAT, KAN, KAT, VYAS, GH, MH, DH, BH, VH, KUMAR, SG1, BAL, KISHO)
 * and Middle Section hyphenated transitions (e.g. "GH-PAN" -> take part before hyphen "GH" -> Gurunanak House).
 */
export function resolveBPSHouse(rawInput: unknown): { house: BPSHouse; section: BPSSection; fullName: string } {
  if (!rawInput) {
    return { house: 'Panini', section: 'Senior', fullName: 'Panini House' };
  }

  const origStr = String(rawInput).trim();
  if (!origStr) {
    return { house: 'Panini', section: 'Senior', fullName: 'Panini House' };
  }

  // Handle Middle Section transition format: "GH-PAN", "GH - PAN", "MH-PAT", "DH-KAT" etc.
  // Rule: Part before hyphen is the current existing house
  let token = origStr;
  if (token.includes('-')) {
    const parts = token.split('-');
    token = parts[0].trim();
  } else if (token.includes('/')) {
    const parts = token.split('/');
    token = parts[0].trim();
  }

  const clean = token.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Direct Abbreviation lookup
  if (BPS_HOUSES_MAP[clean]) {
    const info = BPS_HOUSES_MAP[clean];
    return { house: info.house, section: info.section, fullName: info.fullName };
  }

  // 2. Middle Section specific checks (e.g. GH, GURUNANAK, MH, MAHAVIR, DH, DAYANAND, BH, BUDDHA, VH, VIVEKANAND)
  if (clean === 'GH' || clean.startsWith('GURU') || clean.includes('NANAK')) {
    return { house: 'Gurunanak', section: 'Middle', fullName: 'Gurunanak House' };
  }
  if (clean === 'MH' || clean.startsWith('MAHAVIR') || clean.startsWith('MAHAVEER')) {
    return { house: 'Mahavir', section: 'Middle', fullName: 'Mahavir House' };
  }
  if (clean === 'DH' || clean.startsWith('DAYANAND') || clean.startsWith('DAYA')) {
    return { house: 'Dayanand', section: 'Middle', fullName: 'Dayanand House' };
  }
  if (clean === 'BH' || clean.startsWith('BUDDHA') || clean.startsWith('BUDHA')) {
    return { house: 'Buddha', section: 'Middle', fullName: 'Buddha House' };
  }
  if (clean === 'VH' || clean.startsWith('VIVEK') || clean.startsWith('SWAMI')) {
    return { house: 'Vivekananda', section: 'Middle', fullName: 'Vivekananda House' };
  }

  // 3. Junior Section specific checks (KUMAR, SG1, BAL, KISHO/KISHORE)
  if (clean === 'KUMAR' || clean === 'KUM' || clean.startsWith('KUMAR')) {
    return { house: 'Kumar', section: 'Junior', fullName: 'Kumar House' };
  }
  if (
    clean === 'SG1' ||
    clean === 'SG' ||
    clean === 'SHISHUGRIHA1' ||
    clean.includes('SHISHU') ||
    clean.includes('GRIHA')
  ) {
    return { house: 'Shishu Griha 1', section: 'Junior', fullName: 'Shishu Griha 1' };
  }
  if (clean === 'BAL' || clean.startsWith('BAL')) {
    return { house: 'Bal', section: 'Junior', fullName: 'Bal House' };
  }
  if (clean === 'KISHO' || clean === 'KISHORE' || clean.startsWith('KISH')) {
    return { house: 'Kishore', section: 'Junior', fullName: 'Kishore House' };
  }

  // 4. Senior Section specific checks (PAN, PAT, KAN, KAT, VYAS)
  if (clean === 'PAN' || clean.startsWith('PANINI') || clean.startsWith('PAN')) {
    return { house: 'Panini', section: 'Senior', fullName: 'Panini House' };
  }
  if (clean === 'PAT' || clean.startsWith('PATANJALI') || clean.startsWith('PAT')) {
    return { house: 'Patanjali', section: 'Senior', fullName: 'Patanjali House' };
  }
  if (clean === 'KAN' || clean.startsWith('KANAD') || clean.startsWith('KAN')) {
    return { house: 'Kanad', section: 'Senior', fullName: 'Kanad House' };
  }
  if (clean === 'KAT' || clean.startsWith('KATYAYAN') || clean.startsWith('KAT')) {
    return { house: 'Katyayan', section: 'Senior', fullName: 'Katyayan House' };
  }
  if (clean === 'VYAS' || clean.startsWith('VYAS') || clean === 'VYS') {
    return { house: 'Vyas', section: 'Senior', fullName: 'Vyas House' };
  }

  // 5. Check against ALL_HOUSES directly
  const lowerInput = origStr.toLowerCase();
  for (const h of ALL_HOUSES) {
    if (lowerInput.includes(h.toLowerCase())) {
      if (SENIOR_HOUSES.includes(h)) {
        return { house: h, section: 'Senior', fullName: `${h} House` };
      }
      if (MIDDLE_HOUSES.includes(h)) {
        return { house: h, section: 'Middle', fullName: `${h} House` };
      }
      return { house: h, section: 'Junior', fullName: `${h} House` };
    }
  }

  // Default to Panini (Senior)
  return { house: 'Panini', section: 'Senior', fullName: 'Panini House' };
}

export type MovementType =
  | 'Personal Leave'
  | 'On Duty'
  | 'Medical'
  | 'Home Leave'
  | 'Outing'
  | 'Other';

export const MOVEMENT_TYPES: MovementType[] = [
  'Personal Leave',
  'On Duty',
  'Medical',
  'Home Leave',
  'Outing',
  'Other',
];

export interface Student {
  id: string;
  admissionNo: string; // e.g. 12455
  name: string;
  class: string;
  section: string; // Class section e.g. A, B
  house: BPSHouse;
  schoolSection?: BPSSection; // Senior, Middle, Junior
  houseFullName?: string; // e.g. Panini House, Gurunanak House
  houseNo: string; // BPSST50 + 5-digit admission e.g. BPSST5012455
  photo?: string;
  qrId: string; // unique QR ID or houseNo
  status: 'ON_CAMPUS' | 'OUTSIDE' | 'BLOCKED';
  contactNo?: string;
  fatherName?: string;
}

export type EmailStatus = 'Pending' | 'Sent' | 'Failed';

export interface StudentMovement {
  id: string;
  sNo: number;
  gatePassNo: string; // Physical pass number entered by guard
  studentId: string;
  studentName: string;
  house: BPSHouse;
  houseNo: string;
  dateTimeOut: string; // ISO string from database / server
  dateTimeIn?: string; // Recorded automatically upon return
  vehicleNo: string;
  goingWithWhom: string;
  whoDropped?: string; // Captured at return
  movementType: MovementType;
  purposeReason: string;
  status: 'OUTSIDE' | 'COMPLETED';
  // Automated Digital Pass & Email fields
  recipientEmail?: string;
  isGoingSelf?: boolean;
  parentGuardianEmail?: string;
  emailStatus?: EmailStatus;
  emailError?: string;
  emailSentAt?: string;
  expectedReturn?: string;
}

export interface VisitorGroup {
  id: string;
  passNumber: string; // Temporary Visitor Pass ID (e.g. VP-1042)
  headVisitorName: string;
  email: string;
  phone: string;
  accompanyingNames: string[];
  totalVisitors: number;
  dateTimeIn: string; // Auto timestamp
  dateTimeOut?: string; // Auto timestamp on checkout
  vehicleNumber: string;
  whomToMeet: string;
  purposeReason: string;
  status: 'ON_CAMPUS' | 'CHECKED_OUT';
  // Automated Digital Pass & Email fields
  emailStatus?: EmailStatus;
  emailError?: string;
  emailSentAt?: string;
  expectedValidUntil?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: Role;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  performedBy?: string;
}

export type PublicDisplayMode =
  | 'IDLE'
  | 'SCANNER_ACTIVE'
  | 'STUDENT_SCAN_WAIT'
  | 'SCANNER_DETECTED'
  | 'STUDENT_SCANNED'
  | 'STUDENT_PROCESS_WAIT'
  | 'STUDENT_OUT_SUCCESS'
  | 'STUDENT_IN_SUCCESS'
  | 'VISITOR_REGISTER'
  | 'VISITOR_OUT_WAIT'
  | 'VISITOR_IN_SUCCESS'
  | 'VISITOR_OUT_SUCCESS';

export interface PublicDisplayPayload {
  mode: PublicDisplayMode;
  timestamp: number;
  student?: {
    name: string;
    house: string;
    class: string;
    section: string;
    houseNo: string;
    photo?: string;
    movementType?: string;
    gatePassNo?: string;
    purposeReason?: string;
    vehicleNo?: string;
    goingWithWhom?: string;
    whoDropped?: string;
    dateTimeOut?: string;
    dateTimeIn?: string;
    expectedReturn?: string;
    recipientEmail?: string;
  };
  visitor?: {
    headVisitorName: string;
    passNumber: string;
    totalVisitors: number;
    whomToMeet: string;
    purposeReason?: string;
    vehicleNumber?: string;
    accompanyingNames?: string[];
    dateTimeIn?: string;
    dateTimeOut?: string;
    email?: string;
  };
  scanner?: {
    statusText: string;
    isDetected?: boolean;
    detectedCode?: string;
  };
  message?: string;
  activeActionLabel?: string;
}
