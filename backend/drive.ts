/**
 * Google Drive Integration Layer — SPC
 * ----------------------------------------
 * Manages all interactions with the shared Google Drive folder.
 * Folder hierarchy inside the configured root Drive folder:
 *
 *   <DRIVE_FOLDER_ID>/
 *     SPC/
 *       data-store.json          ← full DB backup, synced on every write
 *       solutions/
 *         <solution-id>/         ← one sub-folder per solution
 *           metadata.json
 *       collaterals/
 *         <collateral-id>/       ← one sub-folder per collateral
 *           metadata.json
 *           <uploaded-files…>
 *       logs/
 *         portal-logs.csv        ← append-only visitor/action log
 *
 * Auth: Service Account JSON key (no OAuth user consent needed).
 * The service account must have "Editor" access on the shared Drive folder.
 */

import { google, drive_v3 } from "googleapis";
import * as fs from "fs";
import { Readable } from "stream";

// ---------------------------------------------------------------------------
// Config — sourced from .env
// ---------------------------------------------------------------------------
const SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || "";
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

// ---------------------------------------------------------------------------
// Internal Drive client (lazy init)
// ---------------------------------------------------------------------------
let _drive: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive | null {
  if (_drive) return _drive;

  if (!SERVICE_ACCOUNT_KEY_FILE || !DRIVE_FOLDER_ID) {
    console.warn("[Drive] GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_DRIVE_FOLDER_ID not set. Drive sync disabled.");
    return null;
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
    console.warn(`[Drive] Service account key file not found at: ${SERVICE_ACCOUNT_KEY_FILE}. Drive sync disabled.`);
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_FILE,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    _drive = google.drive({ version: "v3", auth });
    console.log("[Drive] Google Drive client initialized.");
    return _drive;
  } catch (err) {
    console.error("[Drive] Failed to initialize Drive client:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Folder ID cache — avoids redundant Drive list calls per session
// ---------------------------------------------------------------------------
const _folderIdCache: Record<string, string> = {};

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId: string
): Promise<string> {
  const cacheKey = `${parentId}/${folderName}`;
  if (_folderIdCache[cacheKey]) return _folderIdCache[cacheKey];

  try {
    const res = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    const files = res.data.files || [];
    if (files.length > 0) {
      _folderIdCache[cacheKey] = files[0].id!;
      return files[0].id!;
    }
  } catch (err) {
    console.error(`[Drive] Error searching for folder "${folderName}":`, err);
  }

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  const id = res.data.id!;
  _folderIdCache[cacheKey] = id;
  console.log(`[Drive] Created folder "${folderName}" (id: ${id})`);
  return id;
}

// ---------------------------------------------------------------------------
// Resolve the SPC folder hierarchy (cached after first call)
// ---------------------------------------------------------------------------
let _spcRootId: string | null = null;
let _solutionsFolderId: string | null = null;
let _collateralsFolderId: string | null = null;
let _logsFolderId: string | null = null;

async function resolveSPCFolders(drive: drive_v3.Drive) {
  if (_spcRootId && _solutionsFolderId && _collateralsFolderId && _logsFolderId) {
    return {
      spcRoot: _spcRootId,
      solutions: _solutionsFolderId,
      collaterals: _collateralsFolderId,
      logs: _logsFolderId,
    };
  }
  _spcRootId = await findOrCreateFolder(drive, "SPC", DRIVE_FOLDER_ID);
  _solutionsFolderId = await findOrCreateFolder(drive, "solutions", _spcRootId);
  _collateralsFolderId = await findOrCreateFolder(drive, "collaterals", _spcRootId);
  _logsFolderId = await findOrCreateFolder(drive, "logs", _spcRootId);
  return {
    spcRoot: _spcRootId,
    solutions: _solutionsFolderId,
    collaterals: _collateralsFolderId,
    logs: _logsFolderId,
  };
}

// ---------------------------------------------------------------------------
// Helper: find a file by name inside a specific folder
// ---------------------------------------------------------------------------
async function findFileInFolder(
  drive: drive_v3.Drive,
  fileName: string,
  parentId: string
): Promise<string | null> {
  try {
    const res = await drive.files.list({
      q: `name='${fileName}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    const files = res.data.files || [];
    return files.length > 0 ? files[0].id! : null;
  } catch (err) {
    console.error(`[Drive] Error searching for file "${fileName}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: create or update a file inside a specific Drive folder
// ---------------------------------------------------------------------------
async function upsertFile(
  drive: drive_v3.Drive,
  fileName: string,
  mimeType: string,
  content: string | Buffer,
  parentId: string
): Promise<string | null> {
  const existingId = await findFileInFolder(drive, fileName, parentId);
  const mediaBody = typeof content === "string" ? Readable.from([content]) : Readable.from(content);

  try {
    if (existingId) {
      const res = await drive.files.update({
        fileId: existingId,
        media: { mimeType, body: mediaBody },
        fields: "id",
      });
      return res.data.id || null;
    } else {
      const res = await drive.files.create({
        requestBody: { name: fileName, parents: [parentId] },
        media: { mimeType, body: mediaBody },
        fields: "id",
      });
      console.log(`[Drive] Created "${fileName}" in folder ${parentId}`);
      return res.data.id || null;
    }
  } catch (err) {
    console.error(`[Drive] Error upserting "${fileName}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Sync the local data-store JSON to SPC/ root in Drive
// ---------------------------------------------------------------------------
export async function syncDataStoreToDrive(localFilePath: string): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;

  try {
    const { spcRoot } = await resolveSPCFolders(drive);
    const content = fs.readFileSync(localFilePath, "utf-8");
    await upsertFile(drive, "data-store.json", "application/json", content, spcRoot);
    console.log("[Drive] data-store.json synced to SPC/.");
  } catch (err) {
    console.error("[Drive] Failed to sync data-store.json:", err);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Append a user-log entry to SPC/logs/portal-logs.csv
// ---------------------------------------------------------------------------
export async function appendLogToDrive(log: {
  id: string;
  email: string;
  action: string;
  details: string;
  date: string;
}): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;

  const LOG_FILE = "portal-logs.csv";
  const CSV_HEADER = "id,email,action,details,date\n";

  try {
    const { logs: logsFolderId } = await resolveSPCFolders(drive);
    const existingId = await findFileInFolder(drive, LOG_FILE, logsFolderId);
    const escapeCsv = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    const newRow = `${escapeCsv(log.id)},${escapeCsv(log.email)},${escapeCsv(log.action)},${escapeCsv(log.details)},${escapeCsv(log.date)}\n`;

    if (existingId) {
      const res = await drive.files.get(
        { fileId: existingId, alt: "media" },
        { responseType: "text" }
      );
      const existing = (res.data as string) || CSV_HEADER;
      const updated = existing.endsWith("\n") ? existing + newRow : existing + "\n" + newRow;
      await upsertFile(drive, LOG_FILE, "text/csv", updated, logsFolderId);
    } else {
      await upsertFile(drive, LOG_FILE, "text/csv", CSV_HEADER + newRow, logsFolderId);
    }
    console.log(`[Drive] Log appended to SPC/logs/${LOG_FILE}.`);
  } catch (err) {
    console.error("[Drive] Failed to append log entry:", err);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Upload collateral metadata (+ optional local files) to SPC/collaterals/<id>/
// ---------------------------------------------------------------------------
export async function uploadCollateralMetadataToDrive(collateral: {
  id: string;
  title: string;
  customerName?: string;
  uploadedFiles: { name: string; size: string; type: string }[];
  createdAt: string;
  localFilePaths?: Record<string, string>; // filename → absolute local path
}): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;

  try {
    const { collaterals: collateralsFolderId } = await resolveSPCFolders(drive);
    const itemFolder = await findOrCreateFolder(drive, collateral.id, collateralsFolderId);

    // Always store/update metadata JSON
    const metadata = {
      id: collateral.id,
      title: collateral.title,
      customerName: collateral.customerName,
      uploadedFiles: collateral.uploadedFiles,
      createdAt: collateral.createdAt,
    };
    await upsertFile(drive, "metadata.json", "application/json", JSON.stringify(metadata, null, 2), itemFolder);

    // Upload actual files when local paths are provided
    if (collateral.localFilePaths) {
      for (const [fileName, localPath] of Object.entries(collateral.localFilePaths)) {
        if (fs.existsSync(localPath)) {
          const fileBuffer = fs.readFileSync(localPath);
          const mimeType = collateral.uploadedFiles.find(f => f.name === fileName)?.type || "application/octet-stream";
          await upsertFile(drive, fileName, mimeType, fileBuffer, itemFolder);
          console.log(`[Drive] Uploaded: SPC/collaterals/${collateral.id}/${fileName}`);
        }
      }
    }

    console.log(`[Drive] Collateral "${collateral.title}" → SPC/collaterals/${collateral.id}/`);
  } catch (err) {
    console.error("[Drive] Failed to upload collateral to Drive:", err);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Upload solution metadata to SPC/solutions/<id>/
// ---------------------------------------------------------------------------
export async function uploadSolutionMetadataToDrive(solution: {
  id: string;
  title: string;
  url: string;
  tags?: string[];
  customerName?: string;
  createdAt: string;
}): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;

  try {
    const { solutions: solutionsFolderId } = await resolveSPCFolders(drive);
    const itemFolder = await findOrCreateFolder(drive, solution.id, solutionsFolderId);
    await upsertFile(drive, "metadata.json", "application/json", JSON.stringify(solution, null, 2), itemFolder);
    console.log(`[Drive] Solution "${solution.title}" → SPC/solutions/${solution.id}/`);
  } catch (err) {
    console.error("[Drive] Failed to upload solution metadata to Drive:", err);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Drive health check
// ---------------------------------------------------------------------------
export async function driveHealthCheck(): Promise<{
  connected: boolean;
  folderId: string;
  message: string;
}> {
  const drive = getDriveClient();
  if (!drive) {
    return {
      connected: false,
      folderId: DRIVE_FOLDER_ID || "not configured",
      message: "Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE and GOOGLE_DRIVE_FOLDER_ID in .env",
    };
  }

  try {
    const res = await drive.files.get({ fileId: DRIVE_FOLDER_ID, fields: "id, name" });
    return {
      connected: true,
      folderId: DRIVE_FOLDER_ID,
      message: `Connected to shared Drive folder: "${res.data.name}"`,
    };
  } catch (err: any) {
    return {
      connected: false,
      folderId: DRIVE_FOLDER_ID,
      message: `Drive reachable but folder access failed: ${err.message}`,
    };
  }
}
