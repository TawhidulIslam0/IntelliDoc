import { useState } from "react";
import { uploadFile } from "../api/fileService";

export default function FileUploader({ refreshFiles, folderId = null, profileId = null }) {
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
      // Ensure profileId is passed so fileService.js knows where to put it
      const actualProfileId = profileId || localStorage.getItem("currentProfileId");
       // Upload using presigned URL (fetch-only)
      await uploadFile(file, actualProfileId, folderId);

      alert("File uploaded successfully");
      setFile(null);
      
      // Clear the input field UI
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
 
      // Refresh file list
      refreshFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading}
      />
      <button 
        onClick={handleUpload} 
        disabled={loading || !file}
        style={{ marginLeft: '10px' }}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}