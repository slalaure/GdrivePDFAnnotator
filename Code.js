/**
 * Project: GDrive PDF Annotator
 * Author: Sebastien Lalaurette
 * Year: 2026
 * License: Apache License, Version 2.0
 * * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * * http://www.apache.org/licenses/LICENSE-2.0
 * * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// =========================================================
// CONFIGURATION
// =========================================================
// Leave empty '' for default display.
// Or set your target folder ID, e.g.: '1id7XLvsXGYXXwcAojJesfhlfs0WTAnTv'
const BASE_FOLDER_ID = ''; 
// =========================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GDrive PDF Annotator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fetches main entry points (roots)
 */
function getRoots() {
  if (BASE_FOLDER_ID && BASE_FOLDER_ID.trim() !== '') {
    try {
      const folder = DriveApp.getFolderById(BASE_FOLDER_ID);
      return [{ id: BASE_FOLDER_ID, nameKey: 'customRoot', name: folder.getName(), icon: 'mdi-folder-star', type: 'folder' }];
    } catch (e) {
      Logger.log("Error reading base folder: " + e.message);
    }
  }

  return [
    { id: 'root', nameKey: 'myDrive', icon: 'mdi-folder-google-drive', type: 'folder' },
    { id: 'shared', nameKey: 'shared', icon: 'mdi-account-multiple', type: 'folder' },
    { id: 'starred', nameKey: 'starred', icon: 'mdi-star', type: 'folder' }
  ];
}

/**
 * Lists subfolders of a given parent
 */
function getSubFolders(parentId) {
  let folder;
  if (parentId === 'root') folder = DriveApp.getRootFolder();
  else if (parentId === 'shared') return []; 
  else folder = DriveApp.getFolderById(parentId);

  const folders = [];
  const iter = folder.getFolders();
  while (iter.hasNext()) {
    const f = iter.next();
    folders.push({ id: f.getId(), name: f.getName(), type: 'folder' });
  }
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetches PDF files from a folder with pagination (Lazy Loading)
 * Returns a batch of files and a continuation token
 */
function getPdfsInFolderPaginated(folderId, pageToken) {
  let iter;
  
  if (pageToken) {
    try {
      iter = DriveApp.continueFileIterator(pageToken);
    } catch (e) {
      Logger.log("Invalid or expired token: " + e.message);
      return { files: [], nextToken: null };
    }
  } else {
    // Construct targeted search query
    let query = "mimeType = 'application/pdf' and trashed = false";
    if (folderId === 'root') {
      query += " and 'root' in parents";
    } else if (folderId === 'shared') {
      query += " and sharedWithMe = true";
    } else if (folderId === 'starred') {
      query += " and starred = true";
    } else {
      query += " and '" + folderId + "' in parents";
    }
    iter = DriveApp.searchFiles(query);
  }

  const files = [];
  const PAGE_SIZE = 12; // Batch size per load
  let count = 0;
  
  while (iter && iter.hasNext() && count < PAGE_SIZE) {
    const f = iter.next();
    let ownerName = 'Unknown';
    try {
      ownerName = f.getOwner().getName();
    } catch (e) {}

    files.push({ 
      id: f.getId(), 
      name: f.getName(), 
      parentId: folderId,
      lastUpdated: f.getLastUpdated().toISOString(),
      owner: ownerName
    });
    count++;
  }
  
  let nextToken = null;
  if (iter && iter.hasNext()) {
    nextToken = iter.getContinuationToken();
  }
  
  return {
    files: files,
    nextToken: nextToken
  };
}

/**
 * Fetches PDF content in Base64
 */
function getPdfBase64(fileId) {
  return Utilities.base64Encode(DriveApp.getFileById(fileId).getBlob().getBytes());
}

/**
 * Fetches user identity for author tags
 */
function getUserDetails() {
  const email = Session.getActiveUser().getEmail();
  let initials = "INC";
  
  if (email) {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      initials = (parts[0].charAt(0) + parts[1].substring(0, 2)).toUpperCase();
    } else {
      initials = email.substring(0, 3).toUpperCase();
    }
  }
  return { email: email || 'Anonymous', initials: initials };
}

/**
 * Loads annotation history from the linked JSON file
 */
function loadAnnotationFile(pdfId) {
  const pdfFile = DriveApp.getFileById(pdfId);
  const parentFolder = pdfFile.getParents().next();
  const annoName = pdfFile.getName() + ".annotations.json";
  
  const existing = parentFolder.getFilesByName(annoName);
  if (existing.hasNext()) {
    const content = existing.next().getBlob().getDataAsString();
    const data = JSON.parse(content);
    if (!data.history) {
      return JSON.stringify({ history: [{ date: new Date().toISOString(), author: 'Unknown', data: data }], currentIndex: 0 });
    }
    return content;
  }
  return JSON.stringify({ history: [], currentIndex: -1 });
}

/**
 * Saves annotations to the linked JSON file
 */
function saveAnnotationFile(pdfId, jsonContent) {
  const pdfFile = DriveApp.getFileById(pdfId);
  const parentFolder = pdfFile.getParents().next();
  const annoName = pdfFile.getName() + ".annotations.json";
  
  const existing = parentFolder.getFilesByName(annoName);
  if (existing.hasNext()) {
    existing.next().setContent(jsonContent);
  } else {
    parentFolder.createFile(annoName, jsonContent, MimeType.PLAIN_TEXT);
  }
  return "OK";
}

/**
 * Creates a flattened PDF in Drive with merged annotations
 * Handles existence check and optional overwrite
 */
function saveFlattenedPdf(originalPdfId, base64Data, newFilename, overwrite) {
  const originalFile = DriveApp.getFileById(originalPdfId);
  const parentFolder = originalFile.getParents().next();
  
  // Check if file already exists and is not trashed
  const existingIter = parentFolder.getFilesByName(newFilename);
  let existingFile = null;
  while(existingIter.hasNext()) {
    const f = existingIter.next();
    if (!f.isTrashed()) {
      existingFile = f;
      break;
    }
  }

  if (existingFile && !overwrite) {
    return { status: 'EXISTS' };
  }

  if (existingFile && overwrite) {
    existingFile.setTrashed(true);
  }
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), MimeType.PDF, newFilename);
  const newFile = parentFolder.createFile(blob);
  
  return { status: 'OK', url: newFile.getUrl() };
}
