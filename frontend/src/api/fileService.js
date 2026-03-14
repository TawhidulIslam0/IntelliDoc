const API_URL = "http://localhost:8000/api";

/**
 * Fetch list of files for the current user
 */
export const getFiles = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/files/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch files error:", errorText);
    throw new Error("Failed to fetch files");
  }

  return response.json();
};

/**
 * Validate TXT/PDF file 
 */
const validateFileType = (file) => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".pdf")) return;
  throw new Error("Only TXT and PDF files are allowed");
};

/**
 * Upload file using presigned URL
 */
export const uploadFile = async (file, folderId = null) => {
  validateFileType(file);
  const token = localStorage.getItem("token");

  // Request presigned URL from backend
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
      folder_id: folderId,
    }),
  });

  if (!initiateResp.ok) {
    const errorText = await initiateResp.text();
    console.error("Presigned URL request failed:", errorText);
    throw new Error("Failed to get presigned URL");
  }

  const { presigned_url } = await initiateResp.json();

  // Upload file to S3 
  const s3Resp = await fetch(presigned_url, {
    method: "PUT",
    body: file, // no Content-Type, no extra headers
  });

  if (!s3Resp.ok) {
    const errorText = await s3Resp.text();
    console.error("S3 Upload Error:", errorText);
    throw new Error("Upload to S3 failed");
  }

  return { presigned_url };
};