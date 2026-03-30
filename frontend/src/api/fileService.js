const API_URL = "http://localhost:8000/api";

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

// Validate TXT/PDF/IDOC file 
const validateFileType = (file) => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".idoc")) return;
  throw new Error("Only TXT, PDF, and IDOC files are allowed");
};

// Upload file using presigned URL
export const uploadFile = async (file, profileId, folderId = null) => {
  validateFileType(file);
  const token = localStorage.getItem("token");

  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  if (!profileId) throw new Error("No profile selected");

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
    const err = await initiateResp.text();
    console.error("initiate-upload error:", err);
    throw new Error("Failed to get presigned URL");
  }

  const { presigned_url, file_id } = await initiateResp.json();

  const s3Resp = await fetch(presigned_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!s3Resp.ok) {
    const err = await s3Resp.text();
    console.error("S3 upload error:", err);
    throw new Error("Upload to S3 failed");
  }

  const completeResp = await fetch(`${API_URL}/files/${file_id}/complete`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!completeResp.ok) {
    const err = await completeResp.text();
    console.error("complete upload error:", err);
    throw new Error("Failed to finalize upload");
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

// Download
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