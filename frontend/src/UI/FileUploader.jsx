import { useState } from "react";
import { uploadFile } from "../api/fileService";

export default function FileUploader({ refreshFiles, folderId = null }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setLoading(true);

    try {
      // Upload using presigned URL (fetch-only)
      await uploadFile(file, folderId);
      alert("File uploaded successfully");

      // Reset file input
      setFile(null);
      document.querySelector('input[type="file"]').value = "";

      // Refresh file list
      refreshFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading}
      />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}