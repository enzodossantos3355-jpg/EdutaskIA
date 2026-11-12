import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  SUBSCRIBE = 'subscribe',
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

let _firestoreQuotaBlockedUntil = 0;

export function isFirestoreQuotaExceeded(): boolean {
  return Date.now() < _firestoreQuotaBlockedUntil;
}

export function markFirestoreQuotaExceeded() {
  _firestoreQuotaBlockedUntil = Date.now() + 10 * 60 * 1000; // 10 minutes
}

// ---------------------------------------------------------------------------
// Registros de Diagnóstico e Auditoria de Sincronização (Sem Expor Dados Sensíveis)
// ---------------------------------------------------------------------------
export function logSyncAudit(context: string, payload: {
  userId?: string | null;
  fromCache?: boolean;
  docCount?: number;
  hasError?: boolean;
  errorMsg?: string | null;
}) {
  const now = new Date();
  const brtTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(now);
  const maskedUser = payload.userId ? `${payload.userId.slice(0, 4)}***${payload.userId.slice(-2)}` : 'anon';
  const source = payload.fromCache ? 'Firestore Cache (Offline)' : 'Firestore Server (Live)';
  console.log(`[EduTask Sync Audit] [${brtTime} BRT] [${context}] User: ${maskedUser} | Source: ${source} | Docs: ${payload.docCount ?? 0} ${payload.hasError ? `| Error: ${payload.errorMsg}` : '| Status: OK'}`);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted')) {
    markFirestoreQuotaExceeded();
  } else {
    const errInfo: FirestoreErrorInfo = {
      error: errMsg,
      authInfo: {
        userId: null,
        email: null,
        emailVerified: null,
      },
      operationType,
      path,
    };
    console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  }
  throw new Error(errMsg);
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
    const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `tasks/${taskId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...task, id: taskId });
      await setDoc(doc(db, 'tasks', taskId), sanitized, { merge: true });
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

  async getUserById(userId: string): Promise<any | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveUser(user: any): Promise<boolean> {
    const userId = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `users/${userId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...user, id: userId });
      // Only delete field if explicitly set to null
      if (user.avatar_data === null) {
        sanitized.avatar_data = deleteField();
        sanitized.avatar_content_type = deleteField();
      } else if (user.avatar_data === undefined) {
        delete sanitized.avatar_data;
        delete sanitized.avatar_content_type;
      }
      await setDoc(doc(db, 'users', userId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async updateUser(userId: string, updates: any): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      const sanitized = sanitizeFirestoreData(updates);
      await updateDoc(doc(db, 'users', userId), sanitized);
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, path);
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
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveSubject(subject: any): Promise<boolean> {
    const subId = subject.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `subjects/${subId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...subject, id: subId });
      await setDoc(doc(db, 'subjects', subId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSubject(subId: string): Promise<boolean> {
    const path = `subjects/${subId}`;
    try {
      await deleteDoc(doc(db, 'subjects', subId));
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
    const annId = ann.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `announcements/${annId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...ann, id: annId });
      await setDoc(doc(db, 'announcements', annId), sanitized, { merge: true });
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
    const compId = comp.id || `${comp.user_id}_${comp.task_id}`;
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
    const commentId = comment.id || `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `comments/${commentId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...comment, id: commentId });
      await setDoc(doc(db, 'comments', commentId), sanitized, { merge: true });
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

  // Settings
  async getSettings(key: string): Promise<any | null> {
    const path = `settings/${key}`;
    try {
      const snap = await getDoc(doc(db, 'settings', key));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveSettings(key: string, data: any): Promise<boolean> {
    const path = `settings/${key}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, 'settings', key), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // Files
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

  async saveFile(file: any): Promise<boolean> {
    const fileId = file.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `files/${fileId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...file, id: fileId });
      await setDoc(doc(db, 'files', fileId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async getFile(fileId: string): Promise<any | null> {
    if (isFirestoreQuotaExceeded()) return null;
    const path = `files/${fileId}`;
    try {
      const snap = await getDoc(doc(db, 'files', fileId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
        markFirestoreQuotaExceeded();
        return null;
      }
      handleFirestoreError(e, OperationType.GET, path);
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
      return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  async saveLoginLog(log: any): Promise<boolean> {
    const logId = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `login_logs/${logId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...log, id: logId });
      await setDoc(doc(db, 'login_logs', logId), sanitized, { merge: true });
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
  },

  async clearAllLoginLogs(): Promise<boolean> {
    const path = 'login_logs';
    try {
      const snap = await getDocs(collection(db, path));
      const promises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        promises.push(deleteDoc(doc(db, path, docSnap.id)));
      });
      await Promise.all(promises);
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Student Answers
  async getAllStudentAnswers(): Promise<any[]> {
    const path = 'student_answers';
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

  async saveStudentAnswer(ansOrId: any, maybeAns?: any): Promise<boolean> {
    const ansObj = maybeAns !== undefined ? { ...maybeAns, id: ansOrId } : ansOrId;
    const ansId = typeof ansOrId === 'string' ? ansOrId : ansObj.id || `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `student_answers/${ansId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...ansObj, id: ansId });
      await setDoc(doc(db, 'student_answers', ansId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteStudentAnswer(ansId: string): Promise<boolean> {
    const path = `student_answers/${ansId}`;
    try {
      await deleteDoc(doc(db, 'student_answers', ansId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Summaries / Apostilas
  async getAllSummaries(): Promise<any[]> {
    const path = 'summaries';
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

  async saveSummary(summary: any): Promise<boolean> {
    const sumId = summary.id || `sum_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `summaries/${sumId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...summary, id: sumId });
      await setDoc(doc(db, 'summaries', sumId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSummary(sumId: string): Promise<boolean> {
    const path = `summaries/${sumId}`;
    try {
      await deleteDoc(doc(db, 'summaries', sumId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Student Summary Generations (Recent 7 days history)
  async getAllSummaryGenerations(): Promise<any[]> {
    const path = 'summary_generations';
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

  async saveSummaryGeneration(gen: any): Promise<boolean> {
    const genId = gen.id || `sgen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `summary_generations/${genId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...gen, id: genId });
      await setDoc(doc(db, 'summary_generations', genId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSummaryGeneration(genId: string): Promise<boolean> {
    const path = `summary_generations/${genId}`;
    try {
      await deleteDoc(doc(db, 'summary_generations', genId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Real-time Subscriptions with Audit Logging
  subscribeToTasks(
    userId: string | undefined,
    onNext: (tasks: any[], fromCache: boolean) => void,
    onError: (err: any) => void
  ): Unsubscribe {
    const colRef = collection(db, 'tasks');
    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snap) => {
        const fromCache = snap.metadata.fromCache;
        const tasks: any[] = [];
        snap.forEach((docSnap) => {
          tasks.push({ id: docSnap.id, ...docSnap.data() });
        });
        logSyncAudit('Tasks Subscription', {
          userId,
          fromCache,
          docCount: tasks.length,
          hasError: false,
        });
        onNext(tasks, fromCache);
      },
      (err) => {
        logSyncAudit('Tasks Subscription Error', {
          userId,
          hasError: true,
          errorMsg: err?.message || String(err),
        });
        onError(err);
      }
    );
  },

  subscribeToAnnouncements(
    userId: string | undefined,
    onNext: (announcements: any[], fromCache: boolean) => void,
    onError: (err: any) => void
  ): Unsubscribe {
    const colRef = collection(db, 'announcements');
    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snap) => {
        const fromCache = snap.metadata.fromCache;
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        logSyncAudit('Announcements Subscription', {
          userId,
          fromCache,
          docCount: list.length,
          hasError: false,
        });
        onNext(list, fromCache);
      },
      (err) => {
        logSyncAudit('Announcements Subscription Error', {
          userId,
          hasError: true,
          errorMsg: err?.message || String(err),
        });
        onError(err);
      }
    );
  },
};

