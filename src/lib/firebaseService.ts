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

function detectInitialCollectionPrefix(): string {
  // Node / Server-side detection
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
    const kService = (process.env.K_SERVICE || '').toLowerCase();
    const isAiStudioServer = kService.startsWith('ais-') || Boolean(process.env.AI_STUDIO_APP_ID);
    const isRenderOrVercel = Boolean(
      process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.VERCEL
    );
    const isPreviewServer =
      process.env.EDUTASK_ENV === 'preview' ||
      process.env.IS_PREVIEW === 'true' ||
      isAiStudioServer ||
      (!isRenderOrVercel && process.env.EDUTASK_ENV !== 'production');
    return isPreviewServer ? 'preview_' : '';
  }

  // Browser-side detection (AI Studio Preview / Shared Preview / Vite Dev vs Published Render/Vercel)
  if (typeof window !== 'undefined') {
    const isViteDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);
    const host = (window.location?.hostname || '').toLowerCase();
    const isPreviewHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.includes('scf.usercontent') ||
      host.includes('aistudio') ||
      host.startsWith('ais-dev-') ||
      host.startsWith('ais-pre-') ||
      host.endsWith('.run.app');
    if (isViteDev || isPreviewHost) {
      return 'preview_';
    }
  }

  return '';
}

let _collectionPrefix: string = detectInitialCollectionPrefix();

export function setCollectionPrefix(prefix: string) {
  _collectionPrefix = typeof prefix === 'string' ? prefix : '';
}

export function getCollectionPrefix(): string {
  return _collectionPrefix;
}

function colPath(base: string): string {
  return `${_collectionPrefix}${base}`;
}

export function isFirestoreQuotaExceeded(): boolean {
  return Date.now() < _firestoreQuotaBlockedUntil;
}

export function markFirestoreQuotaExceeded() {
  _firestoreQuotaBlockedUntil = Date.now() + 10 * 60 * 1000; // 10 minutes
}

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
  console.log(`[EduTask Sync Audit] [${brtTime} BRT] [${context}] User: ${maskedUser} | Source: ${source} | Prefix: "${_collectionPrefix}" | Docs: ${payload.docCount ?? 0} ${payload.hasError ? `| Error: ${payload.errorMsg}` : '| Status: OK'}`);
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
  setCollectionPrefix,
  getCollectionPrefix,

  // Tasks
  async getAllTasks(): Promise<any[]> {
    const col = colPath('tasks');
    try {
      const snap = await getDocs(collection(db, col));
      const tasks: any[] = [];
      snap.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() });
      });
      return tasks;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveTask(task: any): Promise<boolean> {
    const col = colPath('tasks');
    const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${taskId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...task, id: taskId });
      await setDoc(doc(db, col, taskId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const col = colPath('tasks');
    const path = `${col}/${taskId}`;
    try {
      await deleteDoc(doc(db, col, taskId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Users
  async getAllUsers(): Promise<any[]> {
    const col = colPath('users');
    try {
      const snap = await getDocs(collection(db, col));
      const users: any[] = [];
      snap.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      return users;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async getUserById(userId: string): Promise<any | null> {
    const col = colPath('users');
    const path = `${col}/${userId}`;
    try {
      const snap = await getDoc(doc(db, col, userId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveUser(user: any): Promise<boolean> {
    const col = colPath('users');
    const userId = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${userId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...user, id: userId });
      if (user.avatar_data === null) {
        sanitized.avatar_data = deleteField();
        sanitized.avatar_content_type = deleteField();
      } else if (user.avatar_data === undefined) {
        delete sanitized.avatar_data;
        delete sanitized.avatar_content_type;
      }
      await setDoc(doc(db, col, userId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async updateUser(userId: string, updates: any): Promise<boolean> {
    const col = colPath('users');
    const path = `${col}/${userId}`;
    try {
      const sanitized = sanitizeFirestoreData(updates);
      await updateDoc(doc(db, col, userId), sanitized);
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    const col = colPath('users');
    const path = `${col}/${userId}`;
    try {
      await deleteDoc(doc(db, col, userId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Subjects
  async getAllSubjects(): Promise<any[]> {
    const col = colPath('subjects');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveSubject(subject: any): Promise<boolean> {
    const col = colPath('subjects');
    const subId = subject.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${subId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...subject, id: subId });
      await setDoc(doc(db, col, subId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSubject(subId: string): Promise<boolean> {
    const col = colPath('subjects');
    const path = `${col}/${subId}`;
    try {
      await deleteDoc(doc(db, col, subId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Announcements
  async getAllAnnouncements(): Promise<any[]> {
    const col = colPath('announcements');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveAnnouncement(ann: any): Promise<boolean> {
    const col = colPath('announcements');
    const annId = ann.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${annId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...ann, id: annId });
      await setDoc(doc(db, col, annId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteAnnouncement(annId: string): Promise<boolean> {
    const col = colPath('announcements');
    const path = `${col}/${annId}`;
    try {
      await deleteDoc(doc(db, col, annId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Completions
  async getAllCompletions(): Promise<any[]> {
    const col = colPath('completions');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveCompletion(comp: any): Promise<boolean> {
    const col = colPath('completions');
    const compId = comp.id || `${comp.user_id}_${comp.task_id}`;
    const path = `${col}/${compId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...comp, id: compId });
      await setDoc(doc(db, col, compId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteCompletion(userId: string, taskId: string): Promise<boolean> {
    const col = colPath('completions');
    const compId = `${userId}_${taskId}`;
    const path = `${col}/${compId}`;
    try {
      await deleteDoc(doc(db, col, compId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Comments
  async getAllComments(): Promise<any[]> {
    const col = colPath('comments');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveComment(comment: any): Promise<boolean> {
    const col = colPath('comments');
    const commentId = comment.id || `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${commentId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...comment, id: commentId });
      await setDoc(doc(db, col, commentId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const col = colPath('comments');
    const path = `${col}/${commentId}`;
    try {
      await deleteDoc(doc(db, col, commentId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Settings
  async getSettings(key: string): Promise<any | null> {
    const col = colPath('settings');
    const path = `${col}/${key}`;
    try {
      const snap = await getDoc(doc(db, col, key));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  async saveSettings(key: string, data: any): Promise<boolean> {
    const col = colPath('settings');
    const path = `${col}/${key}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, col, key), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // Files
  async getAllFiles(): Promise<any[]> {
    const col = colPath('files');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveFile(file: any): Promise<boolean> {
    const col = colPath('files');
    const fileId = file.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${fileId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...file, id: fileId });
      await setDoc(doc(db, col, fileId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async getFile(fileId: string): Promise<any | null> {
    if (isFirestoreQuotaExceeded()) return null;
    const col = colPath('files');
    const path = `${col}/${fileId}`;
    try {
      const snap = await getDoc(doc(db, col, fileId));
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
    const col = colPath('files');
    const path = `${col}/${fileId}`;
    try {
      await deleteDoc(doc(db, col, fileId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Login Logs
  async getAllLoginLogs(): Promise<any[]> {
    const col = colPath('login_logs');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveLoginLog(log: any): Promise<boolean> {
    const col = colPath('login_logs');
    const logId = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${logId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...log, id: logId });
      await setDoc(doc(db, col, logId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteLoginLog(logId: string): Promise<boolean> {
    const col = colPath('login_logs');
    const path = `${col}/${logId}`;
    try {
      await deleteDoc(doc(db, col, logId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async clearAllLoginLogs(): Promise<boolean> {
    const col = colPath('login_logs');
    try {
      const snap = await getDocs(collection(db, col));
      const promises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        promises.push(deleteDoc(doc(db, col, docSnap.id)));
      });
      await Promise.all(promises);
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, col);
    }
  },

  // Student Answers
  async getAllStudentAnswers(): Promise<any[]> {
    const col = colPath('student_answers');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveStudentAnswer(ansOrId: any, maybeAns?: any): Promise<boolean> {
    const col = colPath('student_answers');
    const ansObj = maybeAns !== undefined ? { ...maybeAns, id: ansOrId } : ansOrId;
    const ansId = typeof ansOrId === 'string' ? ansOrId : ansObj.id || `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${ansId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...ansObj, id: ansId });
      await setDoc(doc(db, col, ansId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteStudentAnswer(ansId: string): Promise<boolean> {
    const col = colPath('student_answers');
    const path = `${col}/${ansId}`;
    try {
      await deleteDoc(doc(db, col, ansId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Summaries / Apostilas
  async getAllSummaries(): Promise<any[]> {
    const col = colPath('summaries');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveSummary(summary: any): Promise<boolean> {
    const col = colPath('summaries');
    const sumId = summary.id || `sum_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${sumId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...summary, id: sumId });
      await setDoc(doc(db, col, sumId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSummary(sumId: string): Promise<boolean> {
    const col = colPath('summaries');
    const path = `${col}/${sumId}`;
    try {
      await deleteDoc(doc(db, col, sumId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Summary Topics (Separados dos Resumos — visíveis apenas para o Admin)
  async getAllSummaryTopics(): Promise<any[]> {
    const col = colPath('summary_topics');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveSummaryTopic(topicItem: any): Promise<boolean> {
    const col = colPath('summary_topics');
    const topicId = topicItem.id || `top_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${topicId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...topicItem, id: topicId });
      await setDoc(doc(db, col, topicId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSummaryTopic(topicId: string): Promise<boolean> {
    const col = colPath('summary_topics');
    const path = `${col}/${topicId}`;
    try {
      await deleteDoc(doc(db, col, topicId));
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Student Summary Generations (Recent 7 days history)
  async getAllSummaryGenerations(): Promise<any[]> {
    const col = colPath('summary_generations');
    try {
      const snap = await getDocs(collection(db, col));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.LIST, col);
    }
  },

  async saveSummaryGeneration(gen: any): Promise<boolean> {
    const col = colPath('summary_generations');
    const genId = gen.id || `sgen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `${col}/${genId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...gen, id: genId });
      await setDoc(doc(db, col, genId), sanitized, { merge: true });
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSummaryGeneration(genId: string): Promise<boolean> {
    const col = colPath('summary_generations');
    const path = `${col}/${genId}`;
    try {
      await deleteDoc(doc(db, col, genId));
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
    const colRef = collection(db, colPath('tasks'));
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
    const colRef = collection(db, colPath('announcements'));
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

  subscribeToSystemSettings(
    onNext: (data: any | null) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const col = colPath('settings');
    const docRef = doc(db, col, 'system');
    return onSnapshot(
      docRef,
      (snap) => {
        onNext(snap.exists() ? snap.data() : null);
      },
      (err) => {
        console.warn(`[Firebase] Erro ao escutar ${col}/system:`, err?.message || err);
        if (onError) onError(err);
      }
    );
  },
};
