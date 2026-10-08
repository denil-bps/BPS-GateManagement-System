import { Student, StudentMovement, VisitorGroup, UserAccount, AuditLog } from '../types';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-ADMIN',
    username: 'admin',
    name: 'Chief Security Officer (Admin)',
    role: 'ADMIN',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'USR-GUARD-1',
    username: 'guard',
    name: 'Golden Gate Duty Guard',
    role: 'GATE_SYSTEM',
    lastLogin: new Date().toISOString(),
  },
];

// Clean real database - 100% empty of demo records
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_MOVEMENTS: StudentMovement[] = [];
export const INITIAL_VISITORS: VisitorGroup[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
