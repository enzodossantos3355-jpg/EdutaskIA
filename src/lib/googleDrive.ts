// Google Drive Workspace integration for EduTask Resumos
// Handles folder creation per subject ("EduTask Resumos / [Matéria]"), uploads and listings

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  folderId?: string;
}

// Search or create a folder in Google Drive
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const sanitizedName = folderName.replace(/'/g, "\\'");
  let query = `name = '${sanitizedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  // 1. Check if folder exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // 2. Create folder if not found
  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao criar pasta "${folderName}" no Google Drive`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

// Ensures root "EduTask Resumos" folder and a subfolder for the specific subject
export async function getOrCreateSubjectFolder(
  accessToken: string,
  subjectName: string
): Promise<{ rootFolderId: string; subjectFolderId: string }> {
  const rootFolderId = await getOrCreateFolder(accessToken, 'EduTask Resumos');
  const subjectFolderId = await getOrCreateFolder(accessToken, subjectName || 'Geral', rootFolderId);
  return { rootFolderId, subjectFolderId };
}

// Synchronize all existing subjects into dedicated Google Drive folders
export async function syncAllSubjectFoldersToDrive(
  accessToken: string,
  subjects: { name: string }[]
): Promise<Record<string, string>> {
  const rootFolderId = await getOrCreateFolder(accessToken, 'EduTask Resumos');
  const folderMap: Record<string, string> = {};

  for (const sub of subjects) {
    if (!sub || !sub.name) continue;
    try {
      const folderId = await getOrCreateFolder(accessToken, sub.name.trim(), rootFolderId);
      folderMap[sub.name.trim()] = folderId;
    } catch (e) {
      console.warn(`Erro ao criar pasta no Drive para ${sub.name}:`, e);
    }
  }

  return folderMap;
}

// List images in a specific Drive folder or all Resumos images
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  query?: string
): Promise<DriveItem[]> {
  let q = query || "mimeType contains 'image/' and trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,mimeType,thumbnailLink,webViewLink,createdTime,size,parents)&pageSize=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao listar arquivos do Google Drive');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    ...f,
    folderId: f.parents?.[0] || folderId,
  }));
}

export async function uploadFileToDrive(
  accessToken: string,
  file: File | Blob,
  fileName?: string,
  mimeType?: string,
  folderId?: string
): Promise<DriveItem> {
  const actualName = fileName || (file as any)?.name || `imagem_resumo_${Date.now()}.jpg`;
  const actualMime = mimeType || (file as any)?.type || 'image/jpeg';
  const metadata: Record<string, any> = {
    name: actualName,
    mimeType: actualMime,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink,mimeType,createdTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao enviar arquivo para o Google Drive');
  }

  return await res.json();
}

// Ensures "EduTask Backups" folder and uploads a system backup ZIP
export async function uploadBackupToDriveFolder(
  accessToken: string,
  fileBlob: Blob,
  fileName: string
): Promise<DriveItem> {
  const backupsFolderId = await getOrCreateFolder(accessToken, 'EduTask Backups');
  return await uploadFileToDrive(
    accessToken,
    fileBlob,
    fileName,
    'application/zip',
    backupsFolderId
  );
}
