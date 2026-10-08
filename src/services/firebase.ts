import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Student, StudentMovement, VisitorGroup, AuditLog, PublicDisplayPayload } from '../types';

let app: ReturnType<typeof initializeApp>;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  db = dbId ? getFirestore(app, dbId) : getFirestore(app);
} catch (err) {
  console.warn('[Firebase] Initialization warning:', err);
}

export const FirebaseService = {
  getDb(): Firestore {
    return db;
  },

  // Save / Update Student
  async saveStudent(student: Student): Promise<void> {
    try {
      if (!db) return;
      await setDoc(doc(db, 'students', student.id), student);
    } catch (err) {
      console.warn('[Firebase] Save student error:', err);
    }
  },

  // Batch Save Students (for Excel/CSV imports)
  async saveStudentsBatch(students: Student[]): Promise<void> {
    try {
      if (!db) return;
      const promises = students.map((s) => setDoc(doc(db, 'students', s.id), s));
      await Promise.all(promises);
    } catch (err) {
      console.warn('[Firebase] Batch save students error:', err);
    }
  },

  // Delete Student
  async deleteStudent(studentId: string): Promise<void> {
    try {
      if (!db) return;
      await deleteDoc(doc(db, 'students', studentId));
    } catch (err) {
      console.warn('[Firebase] Delete student error:', err);
    }
  },

  // Subscribe to students collection in real-time
  subscribeToStudents(callback: (students: Student[]) => void): () => void {
    if (!db) return () => {};
    try {
      return onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
          const list: Student[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Student);
          });
          callback(list);
        },
        (error) => {
          console.warn('[Firebase] Students subscription error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Save Student Movement
  async saveMovement(movement: StudentMovement): Promise<void> {
    try {
      if (!db) return;
      await setDoc(doc(db, 'movements', movement.id), movement);
    } catch (err) {
      console.warn('[Firebase] Save movement error:', err);
    }
  },

  // Subscribe to movements in real-time
  subscribeToMovements(callback: (movements: StudentMovement[]) => void): () => void {
    if (!db) return () => {};
    try {
      return onSnapshot(
        collection(db, 'movements'),
        (snapshot) => {
          const list: StudentMovement[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as StudentMovement);
          });
          list.sort((a, b) => (b.sNo || 0) - (a.sNo || 0));
          callback(list);
        },
        (error) => {
          console.warn('[Firebase] Movements subscription error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Save Visitor Group
  async saveVisitor(visitor: VisitorGroup): Promise<void> {
    try {
      if (!db) return;
      await setDoc(doc(db, 'visitors', visitor.id), visitor);
    } catch (err) {
      console.warn('[Firebase] Save visitor error:', err);
    }
  },

  // Subscribe to visitors in real-time
  subscribeToVisitors(callback: (visitors: VisitorGroup[]) => void): () => void {
    if (!db) return () => {};
    try {
      return onSnapshot(
        collection(db, 'visitors'),
        (snapshot) => {
          const list: VisitorGroup[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as VisitorGroup);
          });
          list.sort(
            (a, b) => new Date(b.dateTimeIn).getTime() - new Date(a.dateTimeIn).getTime()
          );
          callback(list);
        },
        (error) => {
          console.warn('[Firebase] Visitors subscription error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Save Audit Log
  async saveAuditLog(log: AuditLog): Promise<void> {
    try {
      if (!db) return;
      await setDoc(doc(db, 'audit_logs', log.id), log);
    } catch (err) {
      console.warn('[Firebase] Save audit error:', err);
    }
  },

  // Subscribe to audit logs
  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    if (!db) return () => {};
    try {
      return onSnapshot(
        collection(db, 'audit_logs'),
        (snapshot) => {
          const list: AuditLog[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as AuditLog);
          });
          list.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          callback(list);
        },
        (error) => {
          console.warn('[Firebase] Audit logs subscription error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Public Display Real-Time Sync
  async broadcastPublicDisplay(payload: PublicDisplayPayload): Promise<void> {
    try {
      if (!db) return;
      await setDoc(doc(db, 'public_display', 'current_state'), payload);
    } catch (err) {
      console.warn('[Firebase] Public display broadcast error:', err);
    }
  },

  // Subscribe to Public Display state
  subscribeToPublicDisplay(callback: (payload: PublicDisplayPayload) => void): () => void {
    if (!db) return () => {};
    try {
      return onSnapshot(
        doc(db, 'public_display', 'current_state'),
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data() as PublicDisplayPayload);
          }
        },
        (error) => {
          console.warn('[Firebase] Public display subscription error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Wipe All Cloud Collections (for requested clean slate)
  async clearAllCloudCollections(): Promise<void> {
    if (!db) return;
    try {
      const collections = ['students', 'movements', 'visitors', 'audit_logs'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        const deletes = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletes);
      }
    } catch (err) {
      console.warn('[Firebase] Clear all collections error:', err);
    }
  },
};
