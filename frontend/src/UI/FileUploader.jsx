import { useState, useRef } from "react";
import { uploadFile, cancelFileUpload } from "../api/fileService";
import FileProgressBar from "./FileProgressBar"; // Ensure this path is correct

export default function FileUploader({ refreshFiles, folderId = null, profileId = null }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  
  const abortControllerRef = useRef(null);
  const currentFileIdRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setProgress(0); // Reset progress on new file selection
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (currentFileIdRef.current) {
      try {
        await cancelFileUpload(currentFileIdRef.current);
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }
    setLoading(false);
    setFile(null);
    setProgress(0);
    currentFileIdRef.current = null;
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setProgress(0);

    try {
      const actualProfileId = profileId || localStorage.getItem("currentProfileId");
      
      const result = await uploadFile(
        file, 
        actualProfileId, 
        folderId, 
        (p) => setProgress(p), // Pass setter to update progress bar
        abortControllerRef.current.signal 
      );

      // Now capture ID
      currentFileIdRef.current = result.file_id;

      alert("File uploaded successfully");
      setFile(null);
      setProgress(0);
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      refreshFiles();

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Upload aborted by user");
      } else {
        console.error("Upload error:", error);
        alert(error.message || "Upload failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      {/* ProgressBar Component Integration */}
      <FileProgressBar 
        progress={progress} 
        fileName={file?.name} 
        isUploading={loading} 
        error={null}
      />

      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading}
      />
      
      {!loading ? (
        <button 
          onClick={handleUpload} 
          disabled={!file}
          style={{ marginLeft: '10px' }}
        >
          Upload
        </button>
      ) : (
        <button 
          onClick={handleCancel} 
          style={{ marginLeft: '10px', backgroundColor: '#ff4d4d', color: 'white' }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}