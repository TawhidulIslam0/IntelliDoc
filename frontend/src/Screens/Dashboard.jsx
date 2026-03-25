import React, { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile, getPreviewUrl, deleteFile } from "../api/fileService"; 
import { getFolders, createFolder } from "../api/folderService";
import uploadIcon from "../assets/uploadbutton.png";
import folderIcon from "../assets/folderbutton.png";
import deleteFileIcon from "../assets/deletefilebutton.png"; 
import { ProfileContext } from "../UI/ProfileContext"; 

const DashBoard = ({ onCreateDoc }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fetchedDocuments, setFetchedDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Extract loading state from ProfileContext to prevent premature rendering
  const { currentProfile, loading: profilesLoading } = useContext(ProfileContext); 

  // Fetch user on mount
  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    initialize();
  }, [navigate]);

  // Fetch folders for current profile
  const fetchFolders = useCallback(async () => {
    if (!currentProfile) return;
    try {
      const data = await getFolders(currentProfile.id); // pass profile ID if needed
      setFolders(data);
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  }, [currentProfile]);

  // Fetch files for current folder and profile
  const fetchFiles = useCallback(
    async (folderId = null) => {
      if (!currentProfile) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const url = folderId
          ? `http://localhost:8000/api/files/?folder_id=${folderId}&profile_id=${currentProfile.id}`
          : `http://localhost:8000/api/files/?profile_id=${currentProfile.id}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setFetchedDocuments(data);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }
    },
    [currentProfile]
  );

  // Fetch folders and files whenever currentProfile changes
  useEffect(() => {
    if (!currentProfile) return;

    fetchFolders();
    fetchFiles();
  }, [currentProfile, fetchFolders, fetchFiles]);

  // Create blank document
  const handleNewDocument = () => {
    onCreateDoc();
    navigate("/editor");
  };

  // Preview file
  const handleOpenExistingDoc = async (doc) => {
    try {
      const { url } = await getPreviewUrl(doc.id);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      alert("Failed to preview file");
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteFile(fileId);

      //  remove file from UI 
      setFetchedDocuments((prev) =>
        prev.filter((file) => file.id !== fileId)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete file");
    }
  };

  // File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only TXT, PDF, Word, and Images allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File is too large.");
      return;
    }

    setFile(selectedFile);
  };

  // Upload file
  const handleUpload = async () => {
    if (!file) return alert("Please select a file first.");

    try {
      setUploading(true);

      await uploadFile(file, currentFolderId);

      alert("File uploaded successfully");
      setFile(null);

      await fetchFiles(currentFolderId);
    } catch (err) {
      console.error(err);
      alert("File upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name");
    if (!name) return;

    try {
      await createFolder(name, currentFolderId);
      fetchFolders();
    } catch (err) {
      console.error(err);
      alert("Failed to create folder");
    }
  };

  // Open folder
  const handleFolderClick = (folder) => {
    setCurrentFolderId(folder.id);
    fetchFiles(folder.id);
  };

  // prevents the dashboard from rendering blank before the context is ready
  if (profilesLoading) {
    return (
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", fontSize: 18, color: "#5f6368" }}>
        Loading your workspace...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {user && (
        <div style={{ padding: 20, fontSize: 18, fontWeight: 500 }}>
          Welcome, {user.username}!
        </div>
      )}

      {/* New Document Section */}
      <div style={{ backgroundColor: "#f1f3f4", padding: "18px 0 40px 0" }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontSize: 16 }}>Start a new document</span>

          <div style={{ marginTop: 15, display: "flex", gap: 30 }}>
            <div>
              <div
                onClick={handleNewDocument}
                style={{
                  width: 150,
                  height: 190,
                  backgroundColor: "white",
                  border: "1px solid #dadce0",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 50,
                  color: "#4285f4",
                  cursor: "pointer",
                }}
              >
                +
              </div>

              <div style={{ marginTop: 10, fontWeight: 500 }}>
                Blank document
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Folders */}
      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>Folders</span>

          <div
            style={{
              display: "flex",
              gap: 25,
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                style={{
                  width: 150,
                  height: 100,
                  border: "1px solid #dadce0",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                }}
              >
                📁 {folder.name}
              </div>
            ))}
          </div>

          {/* Files */}
          <span
            style={{
              fontWeight: 500,
              fontSize: 16,
              marginTop: 40,
              display: "block",
            }}
          >
            Files {currentFolderId ? "(Inside Folder)" : ""}
          </span>

          {fetchedDocuments.length === 0 ? (
            <div
              style={{
                marginTop: 20,
                textAlign: "center",
                color: "#5f6368",
              }}
            >
              No documents yet. Upload your first document.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 150px)",
                gap: 25,
                marginTop: 20,
              }}
            >
              {fetchedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={{ width: 150, cursor: "pointer", position: "relative" }} // NEW
                >
                  {/*  Delete button */}
                  <img
                    src={deleteFileIcon}
                    alt="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(doc.id);
                    }}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 20,
                      height: 20,
                      cursor: "pointer",
                      zIndex: 10,
                    }}
                  />

                  <div onClick={() => handleOpenExistingDoc(doc)}>
                    <div
                      style={{
                        height: 190,
                        border: "1px solid #dadce0",
                        borderRadius: 4,
                        backgroundColor: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 600 }}>
                        {doc.mime_type === "application/pdf" ? "PDF" : "TXT"}
                      </span>
                    </div>

                    <div style={{ padding: "10px 0" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.name}
                      </div>

                      <div style={{ fontSize: 12, color: "#5f6368" }}>
                        {(doc.size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        id="fileUploadInput"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Folder Button */}
      <img
        src={folderIcon}
        alt="Create Folder"
        onClick={handleCreateFolder}
        style={{
          position: "fixed",
          bottom: 110,
          right: 30,
          width: 60,
          height: 60,
          cursor: "pointer",
          zIndex: 1000,
        }}
      />

      {/* Upload Button */}
      <img
        src={uploadIcon}
        alt="Upload"
        onClick={() => document.getElementById("fileUploadInput").click()}
        style={{
          position: "fixed",
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          cursor: "pointer",
          zIndex: 1000,
        }}
      />

      {/* Upload confirmation button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            position: "fixed",
            bottom: 190,
            right: 30,
            padding: "10px 20px",
            backgroundColor: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          {uploading ? "Uploading..." : `Upload ${file.name}`}
        </button>
      )}

      {/* File Preview */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "80%",
              height: "80%",
              backgroundColor: "white",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <iframe
              src={previewUrl}
              title="File Preview"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashBoard;