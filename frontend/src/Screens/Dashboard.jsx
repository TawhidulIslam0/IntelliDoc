/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"; // Added useLocation
import { uploadFile, getPreviewUrl, deleteFile, createBlankDoc, renameFile, moveFile, cancelFileUpload, getFileBlob, exportFile} from "../api/fileService";
import { getFolders, createFolder, deleteFolder, renameFolder, downloadFolder } from "../api/folderService";
import uploadIcon from "../assets/uploadbutton.png";
import folderIcon from "../assets/folderbutton.png";
import { ProfileContext } from "../UI/ProfileContext"; 
import ContextMenu from "../UI/ContextMenu"; 
import FileProgressBar from "../UI/FileProgressBar";
import { renderAsync } from "docx-preview";

// Helper function to remove extensions for display (e.g. .idoc, .pdf)
const formatDisplayName = (name) => {
  return name.replace(/\.[^/.]+$/, "");
};

const API_BASE = import.meta.env.VITE_API_URL;


// Sub-component for Folder to handle individual hover state
const FolderItem = ({ folder, onFolderClick, onOpenMenu, onDropFile }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onClick={() => onFolderClick(folder)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropFile(folder.id);
      }}
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
const FileItem = ({ doc, onOpenDoc, onOpenMenu, isRecentDoc, onDragStart }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, doc)}
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
            {isRecentDoc ? "DOC" : 
              doc.mime_type === "application/pdf" ? "PDF" : 
              doc.mime_type === "text/plain" ? "TXT" : 
              doc.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "DOCX" : "FILE"}
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
  const location = useLocation(); // Added hook for search result state
  const [searchParams, setSearchParams] = useSearchParams(); 
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Track Pause State
  const [fetchedDocuments, setFetchedDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderStack, setFolderStack] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [menuConfig, setMenuConfig] = useState(null); // Menu state
  const [draggedFile, setDraggedFile] = useState(null);
  
  // AI Search States
  const semanticResults = location.state?.semanticResults || null;
  const searchQuery = location.state?.query || "";

  // Track specific file ID for server-side cancellation
  const [activeFileId, setActiveFileId] = useState(null);

  // New state to manage upload cancellation
  const [uploadController, setUploadController] = useState(null);
  
  // Flag to handle pause/resume vs cancel logic
  const isPausingRef = useRef(false);

  // New state for handling upload progress tracking
  const [uploadInfo, setUploadInfo] = useState({
    progress: 0,
    fileName: '',
    isUploading: false,
    error: null
  });

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
        const res = await fetch(`${API_BASE}/api/users/me`, {
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

  // Sync folderStack with URL's folderId parameter
  useEffect(() => {
    const folderId = searchParams.get("folderId");
    if (folderId) {
      if (!currentFolderId || String(currentFolderId) !== String(folderId)) {
        setFolderStack([{ id: folderId, name: "Folder" }]); 
      }
    } else {
      if (folderStack.length > 0) {
        setFolderStack([]);
      }
    }
  }, [searchParams]);

  // Handle incoming search results that want to open a preview
  useEffect(() => {
    if (location.state?.openPreviewUrl) {
      setPreviewUrl(location.state.openPreviewUrl);
      // Clean up the history state so it doesn't re-open on manual refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
        ? `${API_BASE}/api/files/?folder_id=${targetId}&profile_id=${currentProfile.id}`
         : `${API_BASE}/api/files/?profile_id=${currentProfile.id}`;

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

  // Helper to clear AI search
  const clearSearch = () => {
    navigate("/dashboard", { state: {} });
  };

  // Handle centralized menu actions
  const handleMenuAction = async (action, item) => {
    if (action === 'delete') {
      menuConfig.type === 'folder' ? handleDeleteFolder(item.id) : handleDeleteFile(item.id);
    } else if (action === 'download') {
  try {
    if (menuConfig.type === 'folder') {
      await downloadFolder(item.id);
    } else {
      const isInternalDoc = item.name.endsWith(".idoc");

      if (isInternalDoc && item.format) {
        await exportFile(item.id, item.format);
      } else {
        await handleDownloadFile(item.id, item.name);
      }
    }
  } catch (err) {
    console.error("Action failed:", err);
    alert("Failed to process request: " + err.message);
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
            
            // Update Dashboard's local fetchedDocuments state
            setFetchedDocuments(prev => prev.map(f => f.id === item.id ? { ...f, name: updatedFile.name } : f));
            
            // Update the parent documents state (setDocuments prop) so the Editor matches instantly
            if (setDocuments) {
              setDocuments(prev => prev.map(doc => 
                doc.id === item.id ? { ...doc, name: updatedFile.name } : doc
              ));
            }

            // Update document.title if the renamed file is the one open
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
    } else if (doc.name.toLowerCase().endsWith(".docx")) {
      try {
        // Fetch the blob using our service
        const blob = await getFileBlob(doc.id);
        
        // We set a flag to trigger the specialized rendering view
        setPreviewUrl("docx-view-mode");
        
        // Wait for the render container to exist in the DOM
        setTimeout(async () => {
          const container = document.getElementById("preview-container");
          if (container) {
            await renderAsync(blob, container);
          }
        }, 100);
        
      } catch (err) {
        console.error("Docx preview failed:", err);
        alert("Failed to render Word document");
      }
    } else {
      try {
        const { url } = await getPreviewUrl(doc.id);
        // Instead of opening a modal, we set this to trigger the inline view
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
      const res = await fetch(`${API_BASE}/api/files/${fileId}/download`,{
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
    
    // Updated allowedTypes to include Word .docx
    const allowedTypes = [
      "text/plain", 
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only TXT, PDF, and Word files are allowed.");
      return;
    }
    
    // Updated to 100 MB
    if (selectedFile.size > 100 * 1024 * 1024) {
      alert("File is too large (Max 100MB).");
      return;
    }
    setFile(selectedFile);
  };

  // Pause Upload
  const handlePauseUpload = () => {
    if (uploadController) {
      isPausingRef.current = true;
      uploadController.abort();
      setIsPaused(true);
      setUploading(false);
    }
  };

  // Resume Upload (Triggers logic to continue from last point)
  const handleResumeUpload = () => {
    setIsPaused(false);
    handleUpload(true); // Call with true to indicate resumption
  };

  // Cancel upload
  const handleCancelUpload = async () => {
    if (uploadController) {
      // isPausingRef.current remains false, so catch block resets state
      uploadController.abort();
      
      // If we have an active file ID, notify the server to cleanup
      if (activeFileId) {
        try {
          await cancelFileUpload(activeFileId);
        } catch (err) {
          console.error("Failed to cancel upload on server:", err);
        }
      }
    }
    setUploading(false);
    setIsPaused(false);
    setFile(null);
    setActiveFileId(null);
    // Reset state to null/default to hide the bar
    setUploadInfo({ progress: 0, fileName: '', isUploading: false, error: null });
    
    // Clear input
    const input = document.getElementById("fileUploadInput");
    if (input) input.value = "";
  };

  // Upload file
  const handleUpload = async (isResuming = false) => {
    if (!file) return alert("Please select a file first.");

    // Only check for duplicates if we aren't resuming an active upload
    const isActuallyResuming = isResuming || !!activeFileId;
    if (!isActuallyResuming) {
        const isDuplicate = fetchedDocuments.some(doc => doc.name === file.name);
        if (isDuplicate) {
          alert("A file with this name already exists in this location.");
          return;
        }
    }
    
    // Create new AbortController for this request
    const controller = new AbortController();
    setUploadController(controller);

    try {
      setUploading(true);
      
      // Keep progress if we are resuming, otherwise reset to 0
      setUploadInfo(prev => ({ 
          ...prev, 
          isUploading: true, 
          error: null,
          progress: isResuming ? prev.progress : 0,
          fileName: file.name
      }));

      // Passing the callback to the uploadFile API to update the state
      const result = await uploadFile(
        file, 
        currentProfile.id, 
        currentFolderId, 
        (percent) => {
          // Ignore initial 0% update if we are resuming to prevent UI flicker
          if (isResuming && percent === 0) return;
          setUploadInfo(prev => ({ ...prev, progress: percent }));
        },
        controller.signal,
        activeFileId // Pass activeFileId if exists for partial uploads
      );
      
      // Track file ID if returned for cancellation support
      if (result && result.file_id) {
        setActiveFileId(result.file_id);
      }

      alert("File uploaded successfully");
      setFile(null);
      setActiveFileId(null);
      setIsPaused(false);
      
      // Clear input
      const input = document.getElementById("fileUploadInput");
      if (input) input.value = "";

      await fetchFiles(currentFolderId);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Upload paused or aborted");
        
        if (isPausingRef.current) {
            //  Keep progress, just reset the ref
            isPausingRef.current = false;
        } else {
            //  reset state
            setUploadInfo({ progress: 0, fileName: '', isUploading: false, error: null });
        }
      } else {
        console.error(err);
        setUploadInfo(prev => ({ ...prev, error: err.message, isUploading: false }));
        alert("File upload failed: " + err.message);
      }
    } finally {
      if (!isPaused) {
          setUploading(false);
          setUploadController(null);
          // Wait briefly so user sees the 100% completion before hiding the bar
          setTimeout(() => {
            setUploadInfo(prev => ({ ...prev, isUploading: false }));
          }, 1500);
      }
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
    setSearchParams({ folderId: folder.id }); // Update URL instead of just local state
    setFolderStack((prev) => [...prev, folder]);
  };

  // Go back one folder
  const handleGoBack = () => {
    const newStack = folderStack.slice(0, -1);
    if (newStack.length === 0) {
      setSearchParams({}); // Clear URL params if at home
    } else {
      setSearchParams({ folderId: newStack[newStack.length - 1].id });
    }
    setFolderStack(newStack);
  };

  // Drag file handler
  const handleDragStart = (e, doc) => {
    setDraggedFile(doc);
    e.dataTransfer.effectAllowed = "move";
  };

  // Move file handler
  const handleMoveFile = async (targetFolderId) => {
    if (!draggedFile || !currentProfile) return;

    try {
      await moveFile(draggedFile.id, targetFolderId, currentProfile.id);
      setFetchedDocuments((prev) => prev.filter((file) => file.id !== draggedFile.id));
      await fetchFiles(currentFolderId);
      await fetchFolders();
    } catch (err) {
      console.error("Failed to move file:", err);
      alert("Failed to move file: " + err.message);
    } finally {
      setDraggedFile(null);
    }
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

// If previewUrl is present show only the preview content 
  if (previewUrl) {
    return (
      <div style={{ flex: 1, backgroundColor: "white", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center" }}>
          <button 
            onClick={() => {
              setPreviewUrl(null); 
              
              // Clear the contents of the container so the old doc is removed from the DOM
              const container = document.getElementById("preview-container");
              if (container) {
                container.innerHTML = ''; 
              }
            }} 
            style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #dadce0", cursor: "pointer", backgroundColor: "white", fontSize: 14 }}
          >
            ← Back to Dashboard
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {previewUrl === "docx-view-mode" ? (
             <div id="preview-container" style={{ padding: "20px" }}></div>
          ) : (
             <iframe 
               src={previewUrl} 
               title="File Preview" 
               style={{ width: "100%", height: "calc(100vh - 120px)", border: "none" }} 
             />
          )}
        </div>
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
          
          {semanticResults ? (
            /* AI SEARCH RESULTS VIEW */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontWeight: 600, fontSize: 18, color: "#1a73e8" }}>
                  AI Search Results for: "{searchQuery}"
                </span>
                <button 
                  onClick={clearSearch}
                  style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #dadce0", cursor: "pointer", backgroundColor: "#fff" }}
                >
                  Clear Search
                </button>
              </div>

              {semanticResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#5f6368" }}>
                  No relevant information found for this query.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: 25 }}>
                  {semanticResults.map((result) => (
                    <div key={result.id}>
                      <FileItem
                        doc={{
                          id: result.id,
                          name: result.name,
                          mime_type: result.mime_type,
                          size_bytes: result.size_bytes || 0,
                        }}
                        onOpenDoc={handleOpenDoc}
                        onOpenMenu={handleOpenMenu}
                        isRecentDoc={false}
                        onDragStart={handleDragStart}
                      />

                      <div
                        style={{
                          fontSize: "11px",
                          color: "#1a73e8",
                          marginTop: "5px",
                          textAlign: "center",
                          fontWeight: 500,
                        }}
                      >
                        Match: {Math.round((result.similarity || 0) * 100)}%
                      </div>

                      {result.snippet && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            color: "#5f6368",
                            lineHeight: 1.4,
                            maxHeight: "48px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {result.snippet}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* REGULAR DASHBOARD VIEW */
            <>
              {/* Recent documents */}
              <span style={{ fontWeight: 500, fontSize: 16 }}>Recent documents</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: 25, marginTop: 20, marginBottom: 40 }}>
                {recentDocs.length === 0 ? (
                  <div style={{ color: "#5f6368", fontSize: 13 }}>No recent documents.</div>
                ) : (
                  recentDocs.map((doc) => (
                    <FileItem key={doc.id} doc={doc} onOpenDoc={handleOpenDoc} onOpenMenu={handleOpenMenu} isRecentDoc={true} onDragStart={handleDragStart} />
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
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSearchParams({}); // Use URL update for home
                      setFolderStack([]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleMoveFile(null);
                    }}
                  >
                    Home
                  </span>
                  {folderStack.map((folder, index) => (
                    <span key={folder.id}>
                      {" / "}
                      <span
                        style={{ cursor: "pointer", fontWeight: 500 }}
                        onClick={() => {
                          const newStack = folderStack.slice(0, index + 1);
                          setSearchParams({ folderId: folder.id });
                          setFolderStack(newStack);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleMoveFile(folder.id);
                        }}
                      >
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
                  <FolderItem key={folder.id} folder={folder} onFolderClick={handleFolderClick} onOpenMenu={handleOpenMenu} onDropFile={handleMoveFile} />
                ))}
              </div>

              {/* Files */}
              <span style={{ fontWeight: 500, fontSize: 16, marginTop: 40, display: "block" }}>Files</span>
              
              {/* Progress Bar Display on top of Files Section */}
              <FileProgressBar 
                progress={uploadInfo.progress}
                fileName={uploadInfo.fileName}
                isUploading={uploadInfo.isUploading}
                error={uploadInfo.error}
                isInterrupted={isPaused}
                onResume={handleResumeUpload}
                onComplete={() => setUploadInfo(prev => ({...prev, isUploading: false}))}
                onDismiss={() => setUploadInfo(prev => ({...prev, error: null}))}
              />

              {uploadedFiles.length === 0 ? (
                <div style={{ marginTop: 20, textAlign: "center", color: "#5f6368" }}>
                  No files yet. Upload your first file.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: 25, marginTop: 20 }}>
                  {uploadedFiles.map((doc) => (
                    <FileItem key={doc.id} doc={doc} onOpenDoc={handleOpenDoc} onOpenMenu={handleOpenMenu} isRecentDoc={false} onDragStart={handleDragStart} />
                  ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" id="fileUploadInput" style={{ display: "none" }} onChange={handleFileChange} accept=".txt,.pdf,.docx" />

      {/* UI Buttons */}
      <img src={folderIcon} alt="Create Folder" onClick={handleCreateFolder} style={{ position: "fixed", bottom: 110, right: 30, width: 60, height: 60, cursor: "pointer", zIndex: 1000 }} />
      <img src={uploadIcon} alt="Upload" onClick={() => document.getElementById("fileUploadInput").click()} style={{ position: "fixed", bottom: 30, right: 30, width: 60, height: 60, cursor: "pointer", zIndex: 1000 }} />

      {file && (
        <div style={{ position: "fixed", bottom: 190, right: 30, display: "flex", gap: "10px", zIndex: 1000 }}>
          {uploading && (
             <button onClick={handlePauseUpload} style={{ padding: "10px 20px", backgroundColor: "#f9ab00", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
               Pause
             </button>
          )}
          {isPaused && (
             <button onClick={handleResumeUpload} style={{ padding: "10px 20px", backgroundColor: "#34a853", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
               Resume
             </button>
          )}
          <button onClick={handleCancelUpload} style={{ padding: "10px 20px", backgroundColor: "#d93025", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Cancel
          </button>
          {!uploading && !isPaused && (
            <button onClick={() => handleUpload()} style={{ padding: "10px 20px", backgroundColor: "#4285f4", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
                Upload {file.name}
            </button>
          )}
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