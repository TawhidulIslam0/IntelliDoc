const API_URL = "http://localhost:8000/api";
const CHUNK_SIZE = 6 * 1024 * 1024; // Matches backend threshold 
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (10240 kb) limit

// Fetch list of files for the current user - Updated to support search
export const getFiles = async (profileId, folderId = null, search = "") => {
  const token = localStorage.getItem("token");

  if (!profileId) profileId = localStorage.getItem("currentProfileId"); 
  if (!profileId) throw new Error("No profile selected");

  const params = new URLSearchParams();
  params.append("profile_id", profileId);

  // If searching ignore the folder_id to perform a global search
  // If not searching append the folder_id to navigate normally
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

// Type + Size 
const validateFile = (file) => {
  const name = file.name.toLowerCase();
  
  // Extension Check
  if (!(name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".idoc"))) {
    throw new Error("Only TXT, PDF, and IDOC files are allowed");
  }

  // Size Check
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`DEBUG_ERROR: File size ${file.size} exceeds limit ${MAX_FILE_SIZE}.`);
  }
};

// Upload file using presigned URL (Supports both Chunked and Standard)
export const uploadFile = async (file, profileId, folderId = null, progressCallback = null) => {
  validateFile(file);
  const token = localStorage.getItem("token");

  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  if (!profileId) throw new Error("No profile selected");

  // Initiate Upload
  const initiateResp = await fetch(`${API_URL}/files/initiate-upload`, {
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
      profile_id: profileId,
    }),
  });

  if (!initiateResp.ok) {
    // specific error message from FastAPI (like "File too large")
    const errData = await initiateResp.json().catch(() => ({ detail: "Failed to initiate upload" }));
    throw new Error(errData.detail || "Failed to initiate upload");
  }

  const { presigned_url, file_id, upload_id } = await initiateResp.json();

  // Handle Upload (Chunked vs Single)
  if (upload_id) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const completedParts = [];

    for (let i = 0; i < totalChunks; i++) {
      const partNumber = i + 1;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Get presigned URL for this specific chunk
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
      });

      const { presigned_url: chunkUrl } = await chunkUrlResp.json();

      // Upload chunk to S3
      const s3Resp = await fetch(chunkUrl, {
        method: "PUT",
        body: chunk,
      });

      if (!s3Resp.ok) throw new Error(`Chunk ${partNumber} upload failed`);

      // ETag is required for completion
      const etag = s3Resp.headers.get("ETag");
      completedParts.push({ ETag: etag, PartNumber: partNumber });

      // Notify UI of progress
      if (progressCallback) {
        progressCallback(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    // Finalize Multipart
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
    });

    if (!completeResp.ok) throw new Error("Failed to finalize chunked upload");
    
  } else {
    // Single upload
    const s3Resp = await fetch(presigned_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!s3Resp.ok) throw new Error("Upload to S3 failed");

    const completeResp = await fetch(`${API_URL}/files/${file_id}/complete`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!completeResp.ok) throw new Error("Failed to finalize upload");
    
    if (progressCallback) progressCallback(100);
  }

  return { file_id };
};

// Preview
export const getPreviewUrl = async (fileId, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}/preview`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to get preview URL");
  return response.json();
};

// Download URL Generator
export const getDownloadUrl = async (fileId, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}/download`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
    console.error("rename file error:", errData);
    throw new Error(errData.detail || "Failed to rename file");
  }
  return response.json(); 
};

// Download trigger
export const downloadFile = async (fileId, fileName, profileId) => {
  const token = localStorage.getItem("token");
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  const url = new URL(`${API_URL}/files/${fileId}/download`);
  url.searchParams.append("profile_id", profileId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to download file");
  const data = await response.json();
  window.open(data.url, "_blank");
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
  if (!response.ok) {
    const err = await response.text();
    console.error("create blank doc error:", err);
    throw new Error("Failed to create blank document");
  }
  return response.json();
};

// Auto-save
export const updateFileContent = async (fileId, content) => {
  const token = localStorage.getItem("token");
  const safeContent = {
    pages: Array.isArray(content?.pages)
      ? content.pages.map(p => p ?? "")
      : typeof content === "string"
        ? [content]
        : [""]
  };
  const response = await fetch(`${API_URL}/files/${fileId}/content`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: safeContent }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error("auto-save error:", err);
    throw new Error("Failed to auto-save document");
  }
  return response.json();
};