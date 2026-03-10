import { useState } from "react";
import { uploadFile } from "../api/fileService";

export default function FileUploader({ refreshFiles }) {
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
      await uploadFile(file);
      alert("File uploaded successfully");
      setFile(null);
      refreshFiles(); // reload file list
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="file-uploader">
      <input type="file" onChange={handleFileChange} />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}