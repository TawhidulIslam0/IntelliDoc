const API_URL = import.meta.env.VITE_API_URL + "/api";
// Increased chunk size to 10MB for better performance on large files
const CHUNK_SIZE = 10 * 1024 * 1024; 
// Increased max limit to be 100MB(102,400kb)
const MAX_FILE_SIZE = 100 * 1024 * 1024; 
// Map to track upload progress by file ID 
const uploadProgressByFile = new Map();

const reportProgress = (fileId, nextProgress, progressCallback) => {
  if (!progressCallback) return;

  const previousProgress = uploadProgressByFile.get(fileId) || 0;
  const safeProgress = Math.max(previousProgress, nextProgress);

  uploadProgressByFile.set(fileId, safeProgress);
  progressCallback(safeProgress);
};

// Fetch list of files for the current user 
export const getFiles = async (profileId, folderId = null, search = "") => {
  const token = localStorage.getItem("token");

  if (!profileId) profileId = localStorage.getItem("currentProfileId"); 
  if (!profileId) throw new Error("No profile selected");

  const params = new URLSearchParams();
  params.append("profile_id", profileId);

  if (search) {
    params.append("search", search);
  } else if (folderId) {
    params.append("folder_id", folderId);
  }

  const response = await fetch(`${API_URL}/files/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch files error:", errorText);
    throw new Error("Failed to fetch files");
  }

  return response.json();
};

// Type + Size Validation
const validateFile = (file) => {
  const name = file.name.toLowerCase();
  if (!(name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".docx"))) {
    throw new Error("Only TXT, PDF, and DOCX files are allowed");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size ${file.size} exceeds the maximum allowed limit of 100MB.`);
  }
};

// Get status of an existing upload (to check for uploaded parts)
export const getResumeUploadStatus = async (fileId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/files/${fileId}/resume-upload`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Failed to resume" }));
    throw new Error(errData.detail || "Failed to fetch resume status");
  }
  
  return response.json();
};

// Extract initiation logic to get ID immediately for cancellation handling
export const initiateUpload = async (file, profileId, folderId = null) => {
  const token = localStorage.getItem("token");
  const actualProfileId = profileId || localStorage.getItem("currentProfileId");
  
  if (!actualProfileId) throw new Error("No profile selected");

  // Calculate total chunks for the backend
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const response = await fetch(`${API_URL}/files/initiate-upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      folder_id: folderId || null,
      profile_id: actualProfileId,
      total_chunks: totalChunks,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Failed to initiate upload" }));
    throw new Error(errData.detail || "Failed to initiate upload");
  }

  return response.json(); // Returns { file_id, presigned_url, upload_id }
};

// Upload file using presigned URL
export const uploadFile = async (file, profileId, folderId = null, progressCallback = null, signal = null, initData = null) => {
  validateFile(file);
  const token = localStorage.getItem("token");

  // If initData is passed, use it; otherwise, initiate now
  const { file_id, upload_id, presigned_url } = initData || await initiateUpload(file, profileId, folderId);

  if (upload_id) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    // Initialize with existing parts if available for resumption, otherwise empty
    const completedParts = initData?.uploaded_parts ? [...initData.uploaded_parts] : [];

    // Set initial progress immediately before starting the loop
    let lastProgress = 0;
    if (progressCallback) {
      lastProgress = Math.max(lastProgress, Math.round((completedParts.length / totalChunks) * 100));
      reportProgress(file_id, lastProgress, progressCallback);
    }
    for (let i = 0; i < totalChunks; i++) {
      const partNumber = i + 1;
      
      // Skip if this part is already uploaded 
      if (completedParts.some(p => p.PartNumber === partNumber)) {
        continue;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkUrlResp = await fetch(`${API_URL}/files/presign-chunk`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_id: file_id,
          part_number: partNumber,
          upload_id: upload_id
        }),
        signal
      });

      const { presigned_url: chunkUrl } = await chunkUrlResp.json();
      const s3Resp = await fetch(chunkUrl, { method: "PUT", body: chunk, signal });
      if (!s3Resp.ok) throw new Error(`Chunk ${partNumber} upload failed`);

      const etag = s3Resp.headers.get("ETag");
      completedParts.push({ ETag: etag, PartNumber: partNumber });

      // Track progress based on actual completed parts
      if (progressCallback) {
        const newProgress = Math.round((completedParts.length / totalChunks) * 100);
        lastProgress = Math.max(lastProgress, newProgress);
        reportProgress(file_id, lastProgress, progressCallback);
      }
    }

    const completeResp = await fetch(`${API_URL}/files/complete-chunked-upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file_id: file_id,
        upload_id: upload_id,
        parts: completedParts
      }),
      signal
    });

    if (!completeResp.ok) throw new Error("Failed to finalize chunked upload");

    reportProgress(file_id, 100, progressCallback);
    uploadProgressByFile.delete(file_id);
    
  } else {
    const s3Resp = await fetch(presigned_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
      signal
    });

    if (!s3Resp.ok) throw new Error("Upload to S3 failed");

    const completeResp = await fetch(`${API_URL}/files/${file_id}/complete`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      signal
    });

    if (!completeResp.ok) throw new Error("Failed to finalize upload");
    reportProgress(file_id, 100, progressCallback);
    uploadProgressByFile.delete(file_id);
  }

  return { file_id };
};

// Preview txt/pdf file
export const getPreviewUrl = async (fileId, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}/preview`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Failed to get preview URL");
  return response.json();
};

// Preview docx files
export const getFileBlob = async (fileId, profileId) => {
    if (!fileId) throw new Error("File ID is required");
    
    // Ensure profileId is provided, or grab it from localStorage as a fallback
    const pId = profileId || localStorage.getItem("currentProfileId");
    if (!pId) throw new Error("Profile ID is required");

    const { url } = await getPreviewUrl(fileId, pId);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    
    return await response.blob();
};

// Download file
export const getDownloadUrl = async (fileId, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}/download`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Failed to download URL");
  return response.json();
};

// Delete file
export const deleteFile = async (fileId, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to delete file");
  return true;
};

// Rename file
export const renameFile = async (fileId, newName) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/files/${fileId}/rename`, {
    method: "PATCH", 
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Failed to rename file" }));
    throw new Error(errData.detail || "Failed to rename file");
  }
  return response.json(); 
};

// Create blank doc
export const createBlankDoc = async (name, profileId, folderId = null) => {
  const token = localStorage.getItem("token");
  const actualProfileId = profileId || localStorage.getItem("currentProfileId");
  if (!actualProfileId) throw new Error("No profile selected");
  const response = await fetch(`${API_URL}/files/create-blank-doc`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name || "Untitled Document.idoc",
      profile_id: actualProfileId,
      folder_id: folderId || null,
    }),
  });
  if (!response.ok) throw new Error("Failed to create blank document");
  return response.json();
};

// updateFileContent to ensure consistent JSON formatting
export const updateFileContent = async (fileId, content, tabId = null) => {
  const token = localStorage.getItem("token");
  
  const safeContent = {
    pages: Array.isArray(content?.pages)
      ? content.pages.map(p => p ?? "")
      : typeof content === "string"
        ? [content]
        : [""]
  };
  
  const url = tabId 
    ? `${API_URL}/tabs/${tabId}` 
    : `${API_URL}/files/${fileId}/content`;

  const response = await fetch(url, {
    method: tabId ? "PATCH" : "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify(tabId ? { content: JSON.stringify(safeContent) } : { content: safeContent }),
  });
  if (!response.ok) throw new Error("Failed to auto-save document");
  return response.json();
};

// Move files
export const moveFile = async (fileId, folderId = null, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const response = await fetch(`${API_URL}/files/${fileId}/move`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id: profileId, folder_id: folderId || null }),
  });
  if (!response.ok) throw new Error("Failed to move file");
  return response.json();
};

// Content Retrieval
export const getFileContent = async (fileId, tabId = null) => {
  const token = localStorage.getItem("token");
  const url = tabId ? `${API_URL}/tabs/${tabId}` : `${API_URL}/files/${fileId}/content`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Failed to fetch content");
  return response.json();
};

// Tab Management
export const getTabs = async (fileId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/tabs/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch tabs");
  return response.json();
};

// Create Tab 
export const createTab = async (fileId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/tabs/${fileId}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error("Failed to create tab");
  return response.json();
};

// Duplicate Tab
export const duplicateTab = async (fileId, tabId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/tabs/${fileId}/duplicate/${tabId}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error("Failed to duplicate tab");
  return response.json();
};

// Update tab
export const updateTab = async (tabId, updateData) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/tabs/${tabId}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) throw new Error("Failed to update tab");
  return response.json();
};

// Delete Tab
export const deleteTab = async (tabId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/tabs/${tabId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to delete tab");
  return true;
};

// Cancel an upload
export const cancelFileUpload = async (fileId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/files/${fileId}/cancel`, {
    method: "PATCH",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Failed to cancel upload" }));
    throw new Error(errData.detail || "Failed to cancel upload");
  }
  
  return response.json();
};

// Resume Upload file
export const resumeUpload = async (fileId, file, profileId, folderId, progressCallback, signal) => {
  //  Fetch the status to see which parts were already uploaded
  const statusData = await getResumeUploadStatus(fileId);
  //  Pass the status data into uploadFile
  return await uploadFile(
    file, 
    profileId, 
    folderId, 
    progressCallback, 
    signal, 
    {
      file_id: fileId,
      upload_id: statusData.upload_id,
      uploaded_parts: statusData.uploaded_parts || []
    }
  );
};

// Download/Export file with conversion
export const exportFile = async (fileId, format, profileId = null) => {
  const token = localStorage.getItem("token");
  const pId = profileId || localStorage.getItem("currentProfileId");
  
  if (!pId) throw new Error("Profile ID is required");

  // Construct URL with query parameters for format and profile
  const url = new URL(`${API_URL}/files/${fileId}/export`);
  url.searchParams.append("format", format);
  url.searchParams.append("profile_id", pId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(errorData.detail || "Failed to export file");
  }

  // Get filename from backend Content-Disposition header
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `exported_file.${format}`;

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch?.[1]) {
      filename = filenameMatch[1];
    }
  }

  // Get the blob and trigger the download
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = downloadUrl;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(downloadUrl);

  return true;
};