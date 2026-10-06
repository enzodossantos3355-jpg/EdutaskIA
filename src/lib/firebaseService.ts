import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeFirestoreData);
  if (typeof obj === 'object') {
    if (obj._methodName || (obj.constructor && obj.constructor.name === 'FieldValue')) {
      return obj;
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeFirestoreData(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export const firebaseService = {
  // Tasks
  async getAllTasks(): Promise<any[]> {
    const path = 'tasks';
    try {
      const snap = await getDocs(collection(db, path));
      const tasks: any[] = [];
      snap.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() });
      });
      return tasks;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveTask(task: any): Promise<boolean> {
    const path = `tasks/${task.id}`;
    try {
      const sanitized = sanitizeFirestoreData(task);
      await setDoc(doc(db, 'tasks', task.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const path = `tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Users
  async getAllUsers(): Promise<any[]> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, path));
      const users: any[] = [];
      snap.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      return users;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveUser(user: any): Promise<boolean> {
    const path = `users/${user.id}`;
    try {
      const sanitized = sanitizeFirestoreData(user);
      if (!user.avatar_data) {
        sanitized.avatar_data = deleteField();
        sanitized.avatar_content_type = deleteField();
      }
      await setDoc(doc(db, 'users', user.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Subjects
  async getAllSubjects(): Promise<any[]> {
    const path = 'subjects';
    try {
      const snap = await getDocs(collection(db, path));
      const subjects: any[] = [];
      snap.forEach((docSnap) => {
        subjects.push({ id: docSnap.id, ...docSnap.data() });
      });
      return subjects;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveSubject(subject: any): Promise<boolean> {
    const path = `subjects/${subject.id}`;
    try {
      const sanitized = sanitizeFirestoreData(subject);
      await setDoc(doc(db, 'subjects', subject.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSubject(subjectId: string): Promise<boolean> {
    const path = `subjects/${subjectId}`;
    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Announcements
  async getAllAnnouncements(): Promise<any[]> {
    const path = 'announcements';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveAnnouncement(ann: any): Promise<boolean> {
    const path = `announcements/${ann.id}`;
    try {
      const sanitized = sanitizeFirestoreData(ann);
      await setDoc(doc(db, 'announcements', ann.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteAnnouncement(annId: string): Promise<boolean> {
    const path = `announcements/${annId}`;
    try {
      await deleteDoc(doc(db, 'announcements', annId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Completions
  async getAllCompletions(): Promise<any[]> {
    const path = 'completions';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveCompletion(comp: any): Promise<boolean> {
    const compId = `${comp.user_id}_${comp.task_id}`;
    const path = `completions/${compId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...comp, id: compId });
      await setDoc(doc(db, 'completions', compId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteCompletion(userId: string, taskId: string): Promise<boolean> {
    const compId = `${userId}_${taskId}`;
    const path = `completions/${compId}`;
    try {
      await deleteDoc(doc(db, 'completions', compId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Comments
  async getAllComments(): Promise<any[]> {
    const path = 'comments';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveComment(comment: any): Promise<boolean> {
    const path = `comments/${comment.id}`;
    try {
      const sanitized = sanitizeFirestoreData(comment);
      await setDoc(doc(db, 'comments', comment.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const path = `comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // System Settings / Config
  async getSettings(id: string): Promise<any | null> {
    const path = `settings/${id}`;
    try {
      const snap = await getDoc(doc(db, 'settings', id));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveSettings(id: string, data: any): Promise<boolean> {
    const path = `settings/${id}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, 'settings', id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // Student Answers
  async getAllStudentAnswers(): Promise<any[]> {
    const path = 'student_answers';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ key: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveStudentAnswer(key: string, data: any): Promise<boolean> {
    const path = `student_answers/${key}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, 'student_answers', key), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // Files & Attachments Storage
  async getAllFiles(): Promise<any[]> {
    const path = 'files';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async getFile(fileId: string): Promise<any | null> {
    const path = `files/${fileId}`;
    try {
      const snap = await getDoc(doc(db, 'files', fileId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveFile(fileRecord: any): Promise<boolean> {
    const path = `files/${fileRecord.id}`;
    try {
      const sanitized = sanitizeFirestoreData(fileRecord);
      await setDoc(doc(db, 'files', fileRecord.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteFile(fileId: string): Promise<boolean> {
    const path = `files/${fileId}`;
    try {
      await deleteDoc(doc(db, 'files', fileId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Login Logs
  async getAllLoginLogs(): Promise<any[]> {
    const path = 'login_logs';
    try {
      const snap = await getDocs(collection(db, path));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveLoginLog(log: any): Promise<boolean> {
    const path = `login_logs/${log.id}`;
    try {
      const sanitized = sanitizeFirestoreData(log);
      await setDoc(doc(db, 'login_logs', log.id), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteLoginLog(logId: string): Promise<boolean> {
    const path = `login_logs/${logId}`;
    try {
      await deleteDoc(doc(db, 'login_logs', logId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
};
