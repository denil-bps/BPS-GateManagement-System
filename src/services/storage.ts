import {
  Student,
  StudentMovement,
  VisitorGroup,
  UserAccount,
  AuditLog,
  PublicDisplayPayload,
  Role,
  EmailStatus,
} from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { FirebaseService } from './firebase';

const STORAGE_KEYS = {
  STUDENTS: 'bps_gateflow_students',
  MOVEMENTS: 'bps_gateflow_movements',
  VISITORS: 'bps_gateflow_visitors',
  AUDIT_LOGS: 'bps_gateflow_audit_logs',
  CURRENT_USER: 'bps_gateflow_current_user',
  PUBLIC_DISPLAY: 'bps_gateflow_public_display_state',
  LOGGED_IN: 'bps_gateflow_logged_in_state',
};

// Cross-tab / cross-monitor broadcast channel
const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('bps_gateflow_sync_channel')
    : null;

let lastBroadcastTimestamp = 0;

export const StorageService = {
  // Push changes to persistent server file storage
  async pushToServer(collection: string, data: unknown[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, data }),
      });
    } catch (err) {
      console.warn(`[DB] Failed to push ${collection} to server:`, err);
    }
  },

  // Sync with persistent server file storage
  async syncWithServer(onDataUpdated?: () => void): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/database');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          let updated = false;

          // 1. Students
          if (Array.isArray(json.students) && json.students.length > 0) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(json.students));
            updated = true;
          } else {
            const localStudents = this.getStudents();
            if (localStudents.length > 0) {
              this.pushToServer('students', localStudents);
            }
          }

          // 2. Movements
          if (Array.isArray(json.movements) && json.movements.length > 0) {
            localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(json.movements));
            updated = true;
          } else {
            const localMov = this.getMovements();
            if (localMov.length > 0) {
              this.pushToServer('movements', localMov);
            }
          }

          // 3. Visitors
          if (Array.isArray(json.visitors) && json.visitors.length > 0) {
            localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(json.visitors));
            updated = true;
          } else {
            const localVis = this.getVisitors();
            if (localVis.length > 0) {
              this.pushToServer('visitors', localVis);
            }
          }

          // 4. Audit Logs
          if (Array.isArray(json.auditLogs) && json.auditLogs.length > 0) {
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(json.auditLogs));
            updated = true;
          }

          if (updated && onDataUpdated) {
            onDataUpdated();
          }
        }
      }
    } catch (err) {
      console.warn('[DB] Server database sync warning:', err);
    }
  },

  initFirebaseSync(onDataUpdated?: () => void) {
    const unsubs: Array<() => void> = [];

    // Also run server file sync
    unsubs.push(this.initDatabaseSync(onDataUpdated));

    // 1. Live Firestore Students sync
    const unsubStudents = FirebaseService.subscribeToStudents((cloudStudents) => {
      if (cloudStudents && cloudStudents.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cloudStudents));
        this.notifyDataChange('STUDENTS');
        if (onDataUpdated) onDataUpdated();
      } else {
        // If Firestore is empty, seed existing local students to cloud!
        const localStudents = this.getStudents();
        if (localStudents.length > 0) {
          FirebaseService.saveStudentsBatch(localStudents);
        }
      }
    });
    unsubs.push(unsubStudents);

    // 2. Live Firestore Movements sync
    const unsubMovements = FirebaseService.subscribeToMovements((cloudMovements) => {
      if (cloudMovements && cloudMovements.length > 0) {
        localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(cloudMovements));
        this.notifyDataChange('MOVEMENTS');
        if (onDataUpdated) onDataUpdated();
      } else {
        const localMov = this.getMovements();
        if (localMov.length > 0) {
          localMov.forEach((m) => FirebaseService.saveMovement(m));
        }
      }
    });
    unsubs.push(unsubMovements);

    // 3. Live Firestore Visitors sync
    const unsubVisitors = FirebaseService.subscribeToVisitors((cloudVisitors) => {
      if (cloudVisitors && cloudVisitors.length > 0) {
        localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(cloudVisitors));
        this.notifyDataChange('VISITORS');
        if (onDataUpdated) onDataUpdated();
      } else {
        const localVis = this.getVisitors();
        if (localVis.length > 0) {
          localVis.forEach((v) => FirebaseService.saveVisitor(v));
        }
      }
    });
    unsubs.push(unsubVisitors);

    // 4. Live Firestore Audit Logs sync
    const unsubLogs = FirebaseService.subscribeToAuditLogs((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(cloudLogs));
        this.notifyDataChange('AUDIT_LOGS');
        if (onDataUpdated) onDataUpdated();
      }
    });
    unsubs.push(unsubLogs);

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  },

  initDatabaseSync(onDataUpdated?: () => void) {
    // Immediate sync on load
    this.syncWithServer(onDataUpdated);

    // Periodic sync every 4 seconds to ensure multi-monitor freshness
    const interval = setInterval(() => {
      this.syncWithServer(onDataUpdated);
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  },

  // 1. Students
  getStudents(): Student[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.notifyDataChange('STUDENTS');
    this.pushToServer('students', students);
    FirebaseService.saveStudentsBatch(students);
  },

  addStudent(student: Student): void {
    const list = this.getStudents();
    const existingIdx = list.findIndex(
      (s) => s.id === student.id || s.admissionNo === student.admissionNo
    );
    if (existingIdx >= 0) {
      list[existingIdx] = student;
    } else {
      list.unshift(student);
    }
    this.saveStudents(list);
    FirebaseService.saveStudent(student);
    this.addAuditLog('ADD_STUDENT', `Added student ${student.name} (${student.admissionNo})`);
  },

  deleteStudent(studentId: string): void {
    const list = this.getStudents();
    const target = list.find(
      (s) => s.id === studentId || s.admissionNo === studentId || s.houseNo === studentId
    );
    const updated = list.filter(
      (s) => s.id !== studentId && s.admissionNo !== studentId && s.houseNo !== studentId
    );
    this.saveStudents(updated);
    FirebaseService.deleteStudent(studentId);

    if (target) {
      this.addAuditLog('DELETE_STUDENT', `Deleted student ${target.name} (${target.admissionNo})`);
    } else {
      this.addAuditLog('DELETE_STUDENT', `Deleted student ID: ${studentId}`);
    }
  },

  getStudentById(id: string): Student | undefined {
    if (!id || typeof id !== 'string') return undefined;
    const cleanId = id.trim().toLowerCase();
    const students = this.getStudents();

    // Direct match
    const direct = students.find(
      (s) =>
        s.id.toLowerCase() === cleanId ||
        s.admissionNo.toLowerCase() === cleanId ||
        s.houseNo.toLowerCase() === cleanId ||
        s.qrId.toLowerCase() === cleanId
    );
    if (direct) return direct;

    // Pattern match for BPS:STU:{admission}:{houseNo}
    if (cleanId.includes('bps:stu:')) {
      const parts = cleanId.split(':');
      const adm = parts[2];
      const hNo = parts[3];
      const found = students.find(
        (s) =>
          (adm && s.admissionNo.toLowerCase() === adm.toLowerCase()) ||
          (hNo && s.houseNo.toLowerCase() === hNo.toLowerCase())
      );
      if (found) return found;
    }

    // Pattern match for BPS-MOV-{gatePassNo}-{studentId}
    if (cleanId.startsWith('bps-mov-')) {
      const parts = cleanId.split('-');
      const targetStudentId = parts[parts.length - 1];
      const found = students.find(
        (s) => s.id.toLowerCase() === targetStudentId || s.admissionNo.toLowerCase() === targetStudentId
      );
      if (found) return found;
    }

    return undefined;
  },

  updateMovementEmailStatus(
    movementId: string,
    status: EmailStatus,
    error?: string,
    recipientEmail?: string
  ): void {
    const movements = this.getMovements();
    const idx = movements.findIndex((m) => m.id === movementId);
    if (idx === -1) return;

    movements[idx] = {
      ...movements[idx],
      emailStatus: status,
      emailError: error || undefined,
      emailSentAt: status === 'Sent' ? new Date().toISOString() : movements[idx].emailSentAt,
      recipientEmail: recipientEmail || movements[idx].recipientEmail,
    };

    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.notifyDataChange('MOVEMENTS');
    FirebaseService.saveMovement(movements[idx]);

    this.addAuditLog(
      'EMAIL_STATUS_UPDATE',
      `Pass #${movements[idx].gatePassNo} email status: ${status}${error ? ` (${error})` : ''}`
    );
  },

  updateVisitorEmailStatus(
    visitorId: string,
    status: EmailStatus,
    error?: string
  ): void {
    const visitors = this.getVisitors();
    const idx = visitors.findIndex((v) => v.id === visitorId);
    if (idx === -1) return;

    visitors[idx] = {
      ...visitors[idx],
      emailStatus: status,
      emailError: error || undefined,
      emailSentAt: status === 'Sent' ? new Date().toISOString() : visitors[idx].emailSentAt,
    };

    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
    this.notifyDataChange('VISITORS');
    FirebaseService.saveVisitor(visitors[idx]);
  },

  /**
   * Smart resolver for any scanned QR or barcode text.
   * Recognizes:
   * 1. Student ID Cards (Admission No, BPS:STU:..., QR ID)
   * 2. Student Gate Passes (BPS-MOV-..., GP-...)
   * 3. Visitor Passes (BPS-VIS-..., VP-...)
   */
  resolveScanCode(rawCode: string): {
    type: 'STUDENT' | 'STUDENT_PASS' | 'VISITOR_PASS' | 'UNKNOWN';
    student?: Student;
    movement?: StudentMovement;
    visitor?: VisitorGroup;
  } {
    if (!rawCode || typeof rawCode !== 'string') {
      return { type: 'UNKNOWN' };
    }
    const clean = rawCode.trim();

    // A. Check for Visitor Pass (BPS-VIS-{passNo} or VP-{1000+})
    if (clean.toUpperCase().startsWith('BPS-VIS-') || clean.toUpperCase().startsWith('VP-')) {
      const passNo = clean.toUpperCase().startsWith('BPS-VIS-')
        ? clean.substring(8).trim()
        : clean.trim();
      const visitors = this.getVisitors();
      const visitor = visitors.find(
        (v) => v.passNumber.toLowerCase() === passNo.toLowerCase() || v.id.toLowerCase() === passNo.toLowerCase()
      );
      if (visitor) {
        return { type: 'VISITOR_PASS', visitor };
      }
    }

    // B. Check for Student Gate Pass (BPS-MOV-{gatePassNo}-{studentId} or GP-...)
    if (clean.toUpperCase().startsWith('BPS-MOV-') || clean.toUpperCase().startsWith('GP-')) {
      const movements = this.getMovements();
      let matchedMov: StudentMovement | undefined;

      if (clean.toUpperCase().startsWith('BPS-MOV-')) {
        const withoutPrefix = clean.substring(8);
        matchedMov = movements.find((m) => withoutPrefix.includes(m.gatePassNo));
      } else {
        matchedMov = movements.find(
          (m) => m.gatePassNo.toLowerCase() === clean.toLowerCase()
        );
      }

      if (matchedMov) {
        const student = this.getStudentById(matchedMov.studentId);
        if (student) {
          return { type: 'STUDENT_PASS', student, movement: matchedMov };
        }
      }
    }

    // C. Check for Student ID Card
    const student = this.getStudentById(clean);
    if (student) {
      const activeMovement = this.getActiveMovementForStudent(student.id);
      return { type: 'STUDENT', student, movement: activeMovement };
    }

    // D. Check if it's a visitor pass without prefix
    const allVisitors = this.getVisitors();
    const vis = allVisitors.find(
      (v) => v.passNumber.toLowerCase() === clean.toLowerCase() || v.id.toLowerCase() === clean.toLowerCase()
    );
    if (vis) {
      return { type: 'VISITOR_PASS', visitor: vis };
    }

    return { type: 'UNKNOWN' };
  },

  updateStudentStatus(studentId: string, status: Student['status']): void {
    const students = this.getStudents();
    let updatedStudent: Student | null = null;
    const updated = students.map((s) => {
      if (s.id === studentId) {
        updatedStudent = { ...s, status };
        return updatedStudent;
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    this.notifyDataChange('STUDENTS');
    if (updatedStudent) {
      FirebaseService.saveStudent(updatedStudent);
    }
  },

  toggleStudentQrBlock(studentId: string): void {
    const students = this.getStudents();
    const s = students.find((item) => item.id === studentId);
    if (!s) return;
    const newStatus = s.status === 'BLOCKED' ? 'ON_CAMPUS' : 'BLOCKED';
    this.updateStudentStatus(studentId, newStatus);
    this.addAuditLog(
      'QR_BLOCK_TOGGLE',
      `Changed student ${s.name} QR status to ${newStatus}`
    );
  },

  // 2. Movements
  getMovements(): StudentMovement[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  recordStudentOut(data: {
    gatePassNo: string;
    student: Student;
    vehicleNo: string;
    goingWithWhom: string;
    movementType: StudentMovement['movementType'];
    purposeReason: string;
    recipientEmail?: string;
    isGoingSelf?: boolean;
    parentGuardianEmail?: string;
    expectedReturn?: string;
    emailStatus?: EmailStatus;
  }): StudentMovement {
    const movements = this.getMovements();
    const nextSNo = movements.length > 0 ? Math.max(...movements.map((m) => m.sNo || 0)) + 1 : 1;

    const newMovement: StudentMovement = {
      id: `MOV-${Date.now()}`,
      sNo: nextSNo,
      gatePassNo: data.gatePassNo,
      studentId: data.student.id,
      studentName: data.student.name,
      house: data.student.house,
      houseNo: data.student.houseNo,
      dateTimeOut: new Date().toISOString(),
      vehicleNo: data.vehicleNo || 'N/A',
      goingWithWhom: data.goingWithWhom,
      movementType: data.movementType,
      purposeReason: data.purposeReason,
      status: 'OUTSIDE',
      recipientEmail: data.recipientEmail,
      isGoingSelf: data.isGoingSelf,
      parentGuardianEmail: data.parentGuardianEmail,
      expectedReturn: data.expectedReturn,
      emailStatus: data.emailStatus || (data.recipientEmail ? 'Pending' : undefined),
    };

    movements.unshift(newMovement);
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.updateStudentStatus(data.student.id, 'OUTSIDE');
    this.notifyDataChange('MOVEMENTS');
    this.pushToServer('movements', movements);
    FirebaseService.saveMovement(newMovement);

    this.broadcastPublicDisplay({
      mode: 'STUDENT_OUT_SUCCESS',
      timestamp: Date.now(),
      student: {
        name: data.student.name,
        house: data.student.house,
        class: data.student.class,
        section: data.student.section,
        houseNo: data.student.houseNo,
        photo: data.student.photo,
        movementType: data.movementType,
        gatePassNo: data.gatePassNo,
        purposeReason: data.purposeReason,
        vehicleNo: data.vehicleNo,
        goingWithWhom: data.isGoingSelf ? 'Self (Unaccompanied)' : data.goingWithWhom,
        dateTimeOut: newMovement.dateTimeOut,
        expectedReturn: data.expectedReturn,
        recipientEmail: data.recipientEmail,
      },
    });

    this.addAuditLog(
      'STUDENT_OUT',
      `Authorized departure for ${data.student.name} (Pass: ${data.gatePassNo}, House: ${data.student.house}${
        data.recipientEmail ? `, Pass Emailed to: ${data.recipientEmail}` : ''
      })`
    );

    return newMovement;
  },

  recordStudentIn(data: {
    movementId: string;
    studentId: string;
    whoDropped: string;
  }): StudentMovement | null {
    const movements = this.getMovements();
    const movIdx = movements.findIndex(
      (m) =>
        (m.id === data.movementId || m.studentId === data.studentId) &&
        m.status === 'OUTSIDE'
    );

    const now = new Date().toISOString();
    let updatedMov: StudentMovement;

    if (movIdx >= 0) {
      movements[movIdx] = {
        ...movements[movIdx],
        dateTimeIn: now,
        whoDropped: data.whoDropped,
        status: 'COMPLETED',
      };
      updatedMov = movements[movIdx];
    } else {
      const student = this.getStudentById(data.studentId);
      updatedMov = {
        id: `MOV-RET-${Date.now()}`,
        sNo: movements.length + 1,
        gatePassNo: 'UNRECORDED_OUT',
        studentId: data.studentId,
        studentName: student?.name || 'Student',
        house: student?.house || 'Panini',
        houseNo: student?.houseNo || 'BPSST5000000',
        dateTimeOut: now,
        dateTimeIn: now,
        vehicleNo: 'Return Walk/Drop',
        goingWithWhom: 'Unknown',
        whoDropped: data.whoDropped,
        movementType: 'Other',
        purposeReason: 'Direct return to gate',
        status: 'COMPLETED',
      };
      movements.unshift(updatedMov);
    }

    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.updateStudentStatus(data.studentId, 'ON_CAMPUS');
    this.notifyDataChange('MOVEMENTS');
    this.pushToServer('movements', movements);
    FirebaseService.saveMovement(updatedMov);

    const student = this.getStudentById(data.studentId);
    this.broadcastPublicDisplay({
      mode: 'STUDENT_IN_SUCCESS',
      timestamp: Date.now(),
      student: {
        name: student?.name || updatedMov.studentName,
        house: student?.house || updatedMov.house,
        class: student?.class || '',
        section: student?.section || '',
        houseNo: student?.houseNo || updatedMov.houseNo,
        photo: student?.photo,
        gatePassNo: updatedMov.gatePassNo,
        movementType: updatedMov.movementType,
        whoDropped: data.whoDropped,
        dateTimeIn: now,
      },
    });

    this.addAuditLog(
      'STUDENT_IN',
      `Processed return of ${student?.name || updatedMov.studentName} (Dropped by: ${data.whoDropped})`
    );

    return updatedMov;
  },

  getActiveMovementForStudent(studentId: string): StudentMovement | undefined {
    return this.getMovements().find(
      (m) => m.studentId === studentId && m.status === 'OUTSIDE'
    );
  },

  // 3. Visitors
  getVisitors(): VisitorGroup[] {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITORS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  createVisitorGroup(data: {
    headVisitorName: string;
    email: string;
    phone: string;
    accompanyingNames: string[];
    vehicleNumber: string;
    whomToMeet: string;
    purposeReason: string;
  }): VisitorGroup {
    const visitors = this.getVisitors();
    const passNumber = `VP-${1000 + visitors.length + 1}`;
    const totalVisitors = 1 + data.accompanyingNames.length;

    const newVisitor: VisitorGroup = {
      id: `VIS-${Date.now()}`,
      passNumber,
      headVisitorName: data.headVisitorName,
      email: data.email,
      phone: data.phone,
      accompanyingNames: data.accompanyingNames,
      totalVisitors,
      dateTimeIn: new Date().toISOString(),
      vehicleNumber: data.vehicleNumber,
      whomToMeet: data.whomToMeet,
      purposeReason: data.purposeReason,
      status: 'ON_CAMPUS',
      emailStatus: data.email ? 'Pending' : undefined,
    };

    visitors.unshift(newVisitor);
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
    this.notifyDataChange('VISITORS');
    this.pushToServer('visitors', visitors);
    FirebaseService.saveVisitor(newVisitor);

    this.broadcastPublicDisplay({
      mode: 'VISITOR_IN_SUCCESS',
      timestamp: Date.now(),
      visitor: {
        headVisitorName: newVisitor.headVisitorName,
        passNumber: newVisitor.passNumber,
        totalVisitors: newVisitor.totalVisitors,
        whomToMeet: newVisitor.whomToMeet,
        purposeReason: newVisitor.purposeReason,
        vehicleNumber: newVisitor.vehicleNumber,
        accompanyingNames: newVisitor.accompanyingNames,
        dateTimeIn: newVisitor.dateTimeIn,
        email: newVisitor.email,
      },
    });

    this.addAuditLog(
      'VISITOR_REGISTER',
      `Issued pass ${passNumber} to ${newVisitor.headVisitorName} (${totalVisitors} persons, Meeting: ${newVisitor.whomToMeet}${
        newVisitor.email ? `, Pass Emailed to: ${newVisitor.email}` : ''
      })`
    );

    return newVisitor;
  },

  checkoutVisitor(visitorIdOrPass: string): VisitorGroup | null {
    const visitors = this.getVisitors();
    const idx = visitors.findIndex(
      (v) =>
        (v.id === visitorIdOrPass || v.passNumber.toLowerCase() === visitorIdOrPass.toLowerCase()) &&
        v.status === 'ON_CAMPUS'
    );

    if (idx === -1) return null;

    visitors[idx] = {
      ...visitors[idx],
      dateTimeOut: new Date().toISOString(),
      status: 'CHECKED_OUT',
    };

    const checkedOut = visitors[idx];
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
    this.notifyDataChange('VISITORS');
    this.pushToServer('visitors', visitors);
    FirebaseService.saveVisitor(checkedOut);

    this.broadcastPublicDisplay({
      mode: 'VISITOR_OUT_SUCCESS',
      timestamp: Date.now(),
      visitor: {
        headVisitorName: checkedOut.headVisitorName,
        passNumber: checkedOut.passNumber,
        totalVisitors: checkedOut.totalVisitors,
        whomToMeet: checkedOut.whomToMeet,
        purposeReason: checkedOut.purposeReason,
        vehicleNumber: checkedOut.vehicleNumber,
        accompanyingNames: checkedOut.accompanyingNames,
        dateTimeIn: checkedOut.dateTimeIn,
        dateTimeOut: checkedOut.dateTimeOut,
        email: checkedOut.email,
      },
    });

    this.addAuditLog(
      'VISITOR_OUT',
      `Completed visit for pass ${checkedOut.passNumber} (${checkedOut.headVisitorName})`
    );

    return checkedOut;
  },

  // 4. Audit Log
  getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addAuditLog(action: string, details: string): void {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const log: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      performedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System',
    };
    logs.unshift(log);
    const trimmed = logs.slice(0, 300);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
    this.notifyDataChange('AUDIT_LOGS');
    this.pushToServer('auditLogs', trimmed);
    FirebaseService.saveAuditLog(log);
  },

  // 5. Users & Auth State
  getCurrentUser(): UserAccount {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return INITIAL_USERS[1]; // default gate guard
  },

  setCurrentUser(user: UserAccount): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
    this.notifyDataChange('USER');
  },

  isLoggedIn(): boolean {
    return localStorage.getItem(STORAGE_KEYS.LOGGED_IN) === 'true';
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    this.notifyDataChange('USER');
  },

  // 6. Public Display Monitor 2
  getPublicDisplayState(): PublicDisplayPayload {
    const raw = localStorage.getItem(STORAGE_KEYS.PUBLIC_DISPLAY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.mode) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return {
      mode: 'IDLE',
      timestamp: 0,
    };
  },

  broadcastPublicDisplay(payload: PublicDisplayPayload): void {
    const now = Date.now();
    const timestamp = Math.max(now, (lastBroadcastTimestamp || 0) + 1);
    lastBroadcastTimestamp = timestamp;

    const payloadWithTime = {
      ...payload,
      timestamp,
    };
    const json = JSON.stringify(payloadWithTime);
    try {
      localStorage.setItem(STORAGE_KEYS.PUBLIC_DISPLAY, json);
      // Force immediate storage event trigger across all tabs & windows
      localStorage.setItem('bps_gateflow_sync_ping', `${payloadWithTime.timestamp}_${payloadWithTime.mode}`);
    } catch {
      // ignore
    }

    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'PUBLIC_DISPLAY_UPDATE', payload: payloadWithTime });
      } catch {
        // ignore
      }
    }

    // Local custom event for instant same-window preview
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('BPS_GATEFLOW_SYNC_EVENT', {
            detail: { type: 'PUBLIC_DISPLAY_UPDATE', payload: payloadWithTime },
          })
        );
      } catch {
        // ignore
      }

      // Also push to server for cross-device/network monitor sync
      try {
        fetch('/api/public-display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    // Real-time Cloud Firestore sync
    FirebaseService.broadcastPublicDisplay(payloadWithTime);
  },

  resetPublicDisplayToIdle(): void {
    this.broadcastPublicDisplay({
      mode: 'IDLE',
      timestamp: Date.now(),
    });
  },

  // 7. Notification Sync across tabs
  notifyDataChange(topic: string): void {
    try {
      localStorage.setItem('bps_gateflow_data_ping', `${Date.now()}_${topic}`);
    } catch {
      // ignore
    }

    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'DATA_CHANGED', topic });
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('BPS_GATEFLOW_SYNC_EVENT', {
            detail: { type: 'DATA_CHANGED', topic },
          })
        );
      } catch {
        // ignore
      }
    }
  },

  subscribeToSync(callback: (event: { type: string; payload?: unknown; topic?: string }) => void): () => void {
    const unsubs: Array<() => void> = [];

    // 1. BroadcastChannel (fast local cross-tab)
    if (syncChannel) {
      const channelListener = (ev: MessageEvent) => {
        try {
          callback(ev.data);
        } catch (e) {
          console.error(e);
        }
      };
      syncChannel.addEventListener('message', channelListener);
      unsubs.push(() => syncChannel.removeEventListener('message', channelListener));
    }

    // 2. Storage event listener (guaranteed standard cross-tab / cross-window)
    if (typeof window !== 'undefined') {
      const storageListener = (ev: StorageEvent) => {
        if (ev.key === STORAGE_KEYS.PUBLIC_DISPLAY && ev.newValue) {
          try {
            const parsed = JSON.parse(ev.newValue);
            callback({ type: 'PUBLIC_DISPLAY_UPDATE', payload: parsed });
          } catch {
            // ignore
          }
        } else if (ev.key === 'bps_gateflow_sync_ping') {
          const latest = StorageService.getPublicDisplayState();
          callback({ type: 'PUBLIC_DISPLAY_UPDATE', payload: latest });
        } else if (ev.key === STORAGE_KEYS.MOVEMENTS || ev.key === STORAGE_KEYS.VISITORS || ev.key === 'bps_gateflow_data_ping') {
          callback({ type: 'DATA_CHANGED', topic: ev.key || 'DATA' });
        }
      };
      window.addEventListener('storage', storageListener);
      unsubs.push(() => window.removeEventListener('storage', storageListener));

      // 3. Local custom event (same window / preview)
      const localListener = (ev: Event) => {
        const customEv = ev as CustomEvent;
        if (customEv.detail) {
          callback(customEv.detail);
        }
      };
      window.addEventListener('BPS_GATEFLOW_SYNC_EVENT', localListener);
      unsubs.push(() => window.removeEventListener('BPS_GATEFLOW_SYNC_EVENT', localListener));
    }

    // 4. Cloud Firestore real-time listener (cross-device & external displays)
    const unsubCloud = FirebaseService.subscribeToPublicDisplay((cloudPayload) => {
      if (cloudPayload) {
        callback({ type: 'PUBLIC_DISPLAY_UPDATE', payload: cloudPayload });
      }
    });
    unsubs.push(unsubCloud);

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          // ignore
        }
      });
    };
  },

  // 8. Wipe & Purge All Data (User requested option)
  async clearDatabase(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.VISITORS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    this.notifyDataChange('DATABASE_CLEARED');
    try {
      await fetch('/api/database/purge', { method: 'POST' });
    } catch (e) {
      console.warn('[DB] Failed to purge server database:', e);
    }
    FirebaseService.clearAllCloudCollections();
    this.resetPublicDisplayToIdle();
  },
};
