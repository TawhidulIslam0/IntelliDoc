/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile, getPreviewUrl, deleteFile, createBlankDoc, renameFile } from "../api/fileService"; 
import { getFolders, createFolder, deleteFolder, renameFolder } from "../api/folderService";
import uploadIcon from "../assets/uploadbutton.png";
import folderIcon from "../assets/folderbutton.png";
import { ProfileContext } from "../UI/ProfileContext"; 
import ContextMenu from "../UI/ContextMenu"; // New Import for the menu

// Helper function to remove extensions for display (e.g. .idoc, .pdf)
const formatDisplayName = (name) => {
  return name.replace(/\.[^/.]+$/, "");
};

// Sub-component for Folder to handle individual hover state
const FolderItem = ({ folder, onFolderClick, onOpenMenu }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onClick={() => onFolderClick(folder)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 150,
        height: 45, 
        border: "1px solid #dadce0",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        cursor: "pointer",
        backgroundColor: isHovered ? "#f1f3f4" : "#fff", 
        position: "relative",
        transition: "background-color 0.1s",
      }}
    > 
      <span style={{ marginRight: 8 }}>📁</span>
      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {folder.name}
      </span>
      
      {/* Menu Trigger for folder - Positioned next to name */}
      {isHovered && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e, 'folder', folder);
          }}
          style={{
            fontWeight: "bold",
            fontSize: "18px",
            color: "#5f6368",
            padding: "0 5px"
          }}
        >
          ⋮
        </div>
      )}
    </div>
  );
};

// Sub-component for File to handle individual hover state
const FileItem = ({ doc, onOpenDoc, onOpenMenu, isRecentDoc }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        width: 150, 
        cursor: "pointer", 
        position: "relative",
        borderRadius: 8,
        backgroundColor: isHovered ? "#e8f0fe" : "transparent", 
        transition: "background-color 0.2s"
      }} 
    >
      <div onClick={() => onOpenDoc(doc)}>
        <div
          style={{
            height: 190,
            border: isHovered ? "1px solid #4285f4" : "1px solid #dadce0",  
            borderRadius: 4,
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border 0.2s"
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: isHovered ? "#4285f4" : "#202124" }}>
            {isRecentDoc ? "DOC" : (doc.mime_type === "application/pdf" ? "PDF" : "FILE")}
          </span>
        </div>

        <div style={{ padding: "10px 5px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: isHovered ? "#1967d2" : "#202124"  
              }}
            >
              {formatDisplayName(doc.name)}
            </div>

            <div style={{ fontSize: 12, color: "#5f6368" }}>
              {isRecentDoc ? "IntelliDoc" : `${(doc.size_bytes / 1024).toFixed(1)} KB`}
            </div>
          </div>

          {/* Menu Trigger for document - Positioned next to name below the file image */}
          {isHovered && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                // Differentiate types so context menu knows which actions to show
                const menuType = doc.name.endsWith(".idoc") ? 'doc' : 'file';
                onOpenMenu(e, menuType, doc);
              }}
              style={{
                fontWeight: "bold",
                fontSize: "18px",
                color: "#5f6368",
                padding: "0 5px"
              }}
            >
              ⋮
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DashBoard = ({ setDocuments }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fetchedDocuments, setFetchedDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderStack, setFolderStack] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [menuConfig, setMenuConfig] = useState(null); // Menu state

  // Derive currentFolderId from the top of the folderStack
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
  // State to handle hover for the "Blank document" card
  const [isNewDocHovered, setIsNewDocHovered] = useState(false);
  // Extract loading state from ProfileContext to prevent premature rendering
  const { currentProfile, loading: profilesLoading } = useContext(ProfileContext); 

  const recentDocs = fetchedDocuments.filter(doc => doc.name.endsWith(".idoc"));
  const uploadedFiles = fetchedDocuments.filter(doc => !doc.name.endsWith(".idoc"));

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
      const data = await getFolders(currentProfile.id, currentFolderId); 
      setFolders(data);
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  }, [currentProfile, currentFolderId]);

  // Fetch files for current folder and profile
  const fetchFiles = useCallback(
    async (folderId = null) => {
      if (!currentProfile) return;
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const targetId = folderId !== null ? folderId : currentFolderId;
        const url = targetId
          ? `http://localhost:8000/api/files/?folder_id=${targetId}&profile_id=${currentProfile.id}`
          : `http://localhost:8000/api/files/?profile_id=${currentProfile.id}`;

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (res.ok) {
          const data = await res.json();
          setFetchedDocuments(data);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }
    },
    [currentProfile, currentFolderId]
  );

  // Added currentFolderId to dependency array to trigger refresh on navigation
  useEffect(() => {
    if (!currentProfile) return;
    fetchFolders();
    fetchFiles();
  }, [currentProfile, currentFolderId, fetchFolders, fetchFiles]);

  // Handle Context Menu Opening
  const handleOpenMenu = (e, type, item) => {
    setMenuConfig({
      x: e.clientX,
      y: e.clientY,
      type: type,
      item: item
    });
  };

  // Handle centralized menu actions
  const handleMenuAction = async (action, item) => {
    if (action === 'delete') {
      menuConfig.type === 'folder' ? handleDeleteFolder(item.id) : handleDeleteFile(item.id);
    } else if (action === 'download') {
      if (menuConfig.type !== 'folder') {
        handleDownloadFile(item.id, item.name);
      }
    } else if (action === 'rename') {
      const currentName = formatDisplayName(item.name);
      const newName = prompt("Enter new name:", currentName);
      
      if (newName && newName !== currentName) {
        try {
          if (menuConfig.type === 'folder') {
            const updatedFolder = await renameFolder(item.id, newName);
            // Update state directly for immediate UI feedback
            setFolders(prev => prev.map(f => f.id === item.id ? { ...f, name: updatedFolder.name } : f));
          } else {
            // Re-append .idoc extension if it's an internal doc type
            const finalName = item.name.endsWith(".idoc") ? `${newName}.idoc` : newName;
            const updatedFile = await renameFile(item.id, finalName);
            
            // 1. Update Dashboard's local fetchedDocuments state
            setFetchedDocuments(prev => prev.map(f => f.id === item.id ? { ...f, name: updatedFile.name } : f));
            
            // 2. Update the parent documents state (setDocuments prop) so the Editor matches instantly
            if (setDocuments) {
              setDocuments(prev => prev.map(doc => 
                doc.id === item.id ? { ...doc, name: updatedFile.name } : doc
              ));
            }

            // 3. Update document.title if the renamed file is the one open
            if (window.location.pathname.includes(item.id)) {
                document.title = `${newName} - IntelliDoc`;
            }
          }
        } catch (err) {
          console.error("Rename failed:", err);
          alert("Failed to rename item");
        }
      }
    }
    setMenuConfig(null);
  };

  // Create blank document
  const handleNewDocument = async () => {
    try {
      if (!currentProfile) return;
      const newDoc = await createBlankDoc(
        "Untitled Document.idoc", 
        currentProfile.id, 
        currentFolderId
      );
      const docId = newDoc.file_id || newDoc.id;
      if (setDocuments) {
        setDocuments(prev => [...prev, { ...newDoc, id: docId, profileId: currentProfile.id }]);
      }
      navigate(`/editor/${docId}`);
    } catch (err) {
      console.error("Failed to create document:", err);
      alert("Could not start a new document. Please try again.");
    }
  };

  // Preview file
  const handleOpenDoc = async (doc) => {
    if (doc.name.endsWith(".idoc")) {
      navigate(`/editor/${doc.id}`);
    } else {
      try {
        const { url } = await getPreviewUrl(doc.id);
        setPreviewUrl(url);
      } catch (err) {
        console.error(err);
        alert("Failed to preview file");
      }
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteFile(fileId);
      setFetchedDocuments((prev) => prev.filter((file) => file.id !== fileId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete file");
    }
  };

  // Download file handler
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token found");
      const res = await fetch(`http://localhost:8000/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get download URL");
      const { url } = await res.json(); 
      const fileResp = await fetch(url);
      if (!fileResp.ok) throw new Error("Failed to fetch file from S3");
      const blob = await fileResp.blob();
      const downloadLink = document.createElement("a");
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(downloadLink.href);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file: " + err.message);
    }
  };

  // File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const allowedTypes = ["text/plain", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"];
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
      await uploadFile(file, currentProfile.id, currentFolderId);
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
      await createFolder(name, currentProfile.id, currentFolderId);
      fetchFolders();
    } catch (err) {
      console.error(err);
      alert("Failed to create folder");
    }
  };

  // Open folder
  const handleFolderClick = (folder) => {
    setFolderStack((prev) => [...prev, folder]);
  };

  // Go back one folder
  const handleGoBack = () => {
    setFolderStack((prev) => prev.slice(0, -1));
  };

  // Delete folder
  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder?")) return;
    try {
      await deleteFolder(folderId, currentProfile.id);
      setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
      if (currentFolderId === folderId) {
        handleGoBack();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete folder");
    }
  };

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

      {/* Document Section */}
      <div style={{ backgroundColor: "#f1f3f4", padding: "18px 0 40px 0" }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontSize: 16 }}>Start a new document</span>
          <div style={{ marginTop: 15, display: "flex", gap: 30 }}>
            <div 
              onMouseEnter={() => setIsNewDocHovered(true)}
              onMouseLeave={() => setIsNewDocHovered(false)}
              style={{ cursor: "pointer" }}
            >
              <div
                onClick={handleNewDocument}
                style={{
                  width: 150, height: 190, backgroundColor: "white",
                  border: isNewDocHovered ? "1px solid #4285f4" : "1px solid #dadce0", 
                  borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 50, color: "#4285f4", transition: "border 0.2s"
                }}
              >
                +
              </div>
              <div style={{ marginTop: 10, fontWeight: 500, color: isNewDocHovered ? "#1967d2" : "#202124" }}>
                Blank document
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          
          {/* Recent documents */}
          <span style={{ fontWeight: 500, fontSize: 16 }}>Recent documents</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: 25, marginTop: 20, marginBottom: 40 }}>
            {recentDocs.length === 0 ? (
              <div style={{ color: "#5f6368", fontSize: 13 }}>No recent documents.</div>
            ) : (
              recentDocs.map((doc) => (
                <FileItem key={doc.id} doc={doc} onOpenDoc={handleOpenDoc} onOpenMenu={handleOpenMenu} isRecentDoc={true} />
              ))
            )}
          </div>

          {/* Breadcrumb Navigation */}
          <div style={{ marginBottom: 15, display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            {folderStack.length > 0 && (
              <button onClick={handleGoBack} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #dadce0", cursor: "pointer", backgroundColor: "white" }}>
                ← Back
              </button>
            )}
            <div>
              <span style={{ cursor: "pointer" }} onClick={() => setFolderStack([])}>Home</span>
              {folderStack.map((folder, index) => (
                <span key={folder.id}>
                  {" / "}
                  <span style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setFolderStack(folderStack.slice(0, index + 1))}>
                    {folder.name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Folders */}
          <span style={{ fontWeight: 500, fontSize: 16 }}>Folders</span>
          <div style={{ display: "flex", gap: 25, marginTop: 20, flexWrap: "wrap" }}>
            {folders.map((folder) => (
              <FolderItem key={folder.id} folder={folder} onFolderClick={handleFolderClick} onOpenMenu={handleOpenMenu} />
            ))}
          </div>

          {/* Files */}
          <span style={{ fontWeight: 500, fontSize: 16, marginTop: 40, display: "block" }}>Files</span>
          {uploadedFiles.length === 0 ? (
            <div style={{ marginTop: 20, textAlign: "center", color: "#5f6368" }}>
              No files yet. Upload your first file.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: 25, marginTop: 20 }}>
              {uploadedFiles.map((doc) => (
                <FileItem key={doc.id} doc={doc} onOpenDoc={handleOpenDoc} onOpenMenu={handleOpenMenu} isRecentDoc={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" id="fileUploadInput" style={{ display: "none" }} onChange={handleFileChange} />

      {/* UI Buttons */}
      <img src={folderIcon} alt="Create Folder" onClick={handleCreateFolder} style={{ position: "fixed", bottom: 110, right: 30, width: 60, height: 60, cursor: "pointer", zIndex: 1000 }} />
      <img src={uploadIcon} alt="Upload" onClick={() => document.getElementById("fileUploadInput").click()} style={{ position: "fixed", bottom: 30, right: 30, width: 60, height: 60, cursor: "pointer", zIndex: 1000 }} />

      {file && (
        <button onClick={handleUpload} disabled={uploading} style={{ position: "fixed", bottom: 190, right: 30, padding: "10px 20px", backgroundColor: "#4285f4", color: "white", border: "none", borderRadius: 6, cursor: "pointer", zIndex: 1000 }}>
          {uploading ? "Uploading..." : `Upload ${file.name}`}
        </button>
      )}

      {/* File Preview */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "80%", height: "80%", backgroundColor: "white", borderRadius: 8, overflow: "hidden" }}>
            <iframe src={previewUrl} title="File Preview" style={{ width: "100%", height: "100%", border: "none" }} />
          </div>
        </div>
      )}

      {/* Context Menu Rendering */}
      {menuConfig && (
        <ContextMenu 
          x={menuConfig.x} 
          y={menuConfig.y} 
          type={menuConfig.type} 
          item={menuConfig.item} 
          onClose={() => setMenuConfig(null)} 
          onAction={handleMenuAction}
        />
      )}
    </div>
  );
};

export default DashBoard;