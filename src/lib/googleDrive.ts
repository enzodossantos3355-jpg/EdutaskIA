import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebase";

// Google Drive Workspace integration for EduTask Automatic Backup System
// Scope minimization: drive.file grants access only to folders/files created by EduTask ("EduTask Backups")
export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: "select_account" });

export interface DriveBackupItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  folderId?: string;
}

export interface DriveAuthState {
  connected: boolean;
  user: {
    uid: string;
    name: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  hasToken: boolean;
}

// In-memory access token cache (NEVER persisted in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedDriveUser: DriveAuthState["user"] = null;
let authListenerInitialized = false;
const authListeners = new Set<(state: DriveAuthState) => void>();

function notifyDriveAuthListeners() {
  const snapshot = getDriveAuthState();
  authListeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // ignore subscriber errors
    }
  });
}

export function getDriveAuthState(): DriveAuthState {
  return {
    connected: Boolean(cachedAccessToken && cachedDriveUser),
    user: cachedDriveUser,
    hasToken: Boolean(cachedAccessToken),
  };
}

export function subscribeDriveAuth(
  listener: (state: DriveAuthState) => void
): () => void {
  authListeners.add(listener);
  listener(getDriveAuthState());
  return () => {
    authListeners.delete(listener);
  };
}

export function initDriveAuth(): () => void {
  if (authListenerInitialized) {
    return () => {};
  }
  authListenerInitialized = true;
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      cachedDriveUser = {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };
      if (!cachedAccessToken && !isSigningIn) {
        cachedAccessToken = null;
      }
    } else {
      cachedAccessToken = null;
      cachedDriveUser = null;
    }
    notifyDriveAuthListeners();
  });
}

export async function signInWithGoogleDrive(): Promise<{
  user: DriveAuthState["user"];
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        "Não foi possível obter a permissão de acesso ao Google Drive."
      );
    }
    cachedAccessToken = credential.accessToken;
    cachedDriveUser = {
      uid: result.user.uid,
      name: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };
    notifyDriveAuthListeners();
    return { user: cachedDriveUser, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = String(error?.code || "");
    if (code === "auth/popup-closed-by-user") {
      throw new Error("Janela de login do Google fechada antes de concluir.");
    }
    if (code === "auth/popup-blocked") {
      throw new Error(
        "O navegador bloqueou o popup do Google. Libere popups para este site e tente novamente."
      );
    }
    if (code === "auth/cancelled-popup-request") {
      throw new Error("Solicitação de login cancelada.");
    }
    throw new Error(
      error?.message || "Falha ao conectar sua conta do Google Drive."
    );
  } finally {
    isSigningIn = false;
  }
}

export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearCachedDriveToken() {
  cachedAccessToken = null;
  notifyDriveAuthListeners();
}

export async function signOutGoogleDrive(): Promise<void> {
  try {
    await auth.signOut();
  } finally {
    cachedAccessToken = null;
    cachedDriveUser = null;
    notifyDriveAuthListeners();
  }
}

function handleDriveResponseError(status: number, body: any, fallback: string): never {
  if (status === 401) {
    clearCachedDriveToken();
    throw new Error(
      "A sessão do Google Drive expirou. Clique em 'Sign in with Google' para reconectar."
    );
  }
  const msg = body?.error?.message || fallback;
  throw new Error(msg);
}

// Search folder by exact name (returns ID or null)
export async function findFolderByName(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  const sanitizedName = folderName.replace(/'/g, "\\'");
  let query = `name = '${sanitizedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name)&pageSize=10`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    handleDriveResponseError(
      searchRes.status,
      err,
      `Falha ao consultar pasta "${folderName}" no Google Drive`
    );
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// Search or create a folder in Google Drive
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const existingId = await findFolderByName(
    accessToken,
    folderName,
    parentFolderId
  );
  if (existingId) return existingId;

  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    handleDriveResponseError(
      createRes.status,
      err,
      `Falha ao criar pasta "${folderName}" no Google Drive`
    );
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

export async function uploadFileToDrive(
  accessToken: string,
  file: File | Blob,
  fileName?: string,
  mimeType?: string,
  folderId?: string
): Promise<DriveBackupItem> {
  const actualName =
    fileName || (file as any)?.name || `edutask_backup_${Date.now()}.zip`;
  const actualMime = mimeType || (file as any)?.type || "application/zip";
  const metadata: Record<string, any> = {
    name: actualName,
    mimeType: actualMime,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType,createdTime,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    handleDriveResponseError(
      res.status,
      err,
      "Falha ao enviar arquivo para o Google Drive"
    );
  }

  return await res.json();
}

// Ensures "EduTask Backups" folder and uploads a system backup ZIP
export async function uploadBackupToDriveFolder(
  accessToken: string,
  fileBlob: Blob,
  fileName: string
): Promise<DriveBackupItem> {
  const backupsFolderId = await getOrCreateFolder(
    accessToken,
    "EduTask Backups"
  );
  return await uploadFileToDrive(
    accessToken,
    fileBlob,
    fileName,
    "application/zip",
    backupsFolderId
  );
}

// List backup ZIP files stored in the "EduTask Backups" folder
export async function listDriveBackups(
  accessToken: string
): Promise<DriveBackupItem[]> {
  const backupsFolderId = await findFolderByName(
    accessToken,
    "EduTask Backups"
  );
  if (!backupsFolderId) return [];

  const q = `'${backupsFolderId}' in parents and trashed = false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&orderBy=createdTime desc&fields=files(id,name,mimeType,webViewLink,createdTime,size,parents)&pageSize=25`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    handleDriveResponseError(
      res.status,
      err,
      "Falha ao listar backups do Google Drive"
    );
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    ...f,
    folderId: f.parents?.[0] || backupsFolderId,
  }));
}

// Download a backup ZIP file from Google Drive
export async function downloadDriveBackup(
  accessToken: string,
  fileId: string
): Promise<Blob> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    handleDriveResponseError(
      res.status,
      err,
      "Falha ao baixar arquivo de backup do Google Drive"
    );
  }

  return await res.blob();
}

// Delete a backup ZIP file from Google Drive (must ONLY be invoked after explicit user confirmation)
export async function deleteDriveBackup(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    handleDriveResponseError(
      res.status,
      err,
      "Falha ao excluir backup do Google Drive"
    );
  }
}
