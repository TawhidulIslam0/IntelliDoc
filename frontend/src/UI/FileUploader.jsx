/* eslint-disable no-unused-vars */
import { useState, useRef } from "react";
import { uploadFile, cancelFileUpload, getResumeUploadStatus } from "../api/fileService";
import FileProgressBar from "./FileProgressBar";

export default function FileUploader({ refreshFiles, folderId = null, profileId = null }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle', 'uploading', 'paused', 'error'
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); 
  
  const abortControllerRef = useRef(null);
  const currentFileIdRef = useRef(null);

  // store resume metadata so progress doesn't reset
  const resumeDataRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setProgress(0);
    setError(null);
    setStatus("idle");
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
    setStatus("idle");
    setFile(null);
    setProgress(0);
    setError(null);
    currentFileIdRef.current = null;
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  //  
  const handleResume = async () => {
    if (!currentFileIdRef.current || !file) return;

    abortControllerRef.current = new AbortController();
    setStatus("uploading");
    setError(null);

    try {
      const resumeData =
        resumeDataRef.current ||
        await getResumeUploadStatus(currentFileIdRef.current);

      await uploadFile(
        file,
        profileId,
        folderId,
        (p) => setProgress(p),
        abortControllerRef.current.signal,
        {
          file_id: currentFileIdRef.current,
          upload_id: resumeData.upload_id,
          uploaded_parts: resumeData.uploaded_parts || []
        }
      );

      setStatus("idle");
      setFile(null);
      setProgress(0);
      refreshFiles();

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus("paused");
      } else {
        setStatus("error");
        setError(error.message);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    abortControllerRef.current = new AbortController();
    setStatus("uploading");
    setError(null);
    setProgress(0);

    try {
      const result = await uploadFile(
        file, 
        profileId, 
        folderId, 
        (p) => setProgress(p),
        abortControllerRef.current.signal
      );

      currentFileIdRef.current = result.file_id;

      // store resume state immediately after upload starts
      resumeDataRef.current = await getResumeUploadStatus(result.file_id);

      setStatus("idle");
      setFile(null);
      setProgress(0);
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      refreshFiles();

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus("paused");
      } else {
        setStatus("error");
        setError(error.message);
      }
    }
  };

  return (
    <div className="file-uploader">
      <FileProgressBar 
        progress={progress} 
        fileName={file?.name} 
        isUploading={status === "uploading"} 
        isInterrupted={status === "paused"}
        error={error}
        onResume={handleResume}
      />

      <input
        type="file"
        onChange={handleFileChange}
        disabled={status === "uploading"}
      />
      
      {status !== "uploading" ? (
        <button 
          onClick={() => handleUpload()} 
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