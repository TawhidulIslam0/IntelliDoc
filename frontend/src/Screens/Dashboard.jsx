import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import uploadIcon from "../assets/uploadbutton.png";

const HomeScreen = ({ onCreateDoc, onOpenDoc }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  //  Local state for files from the database 
  const [fetchedDocuments, setFetchedDocuments] = useState([]);

  // Function to get the real files 
  const fetchRecentFiles = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/api/files/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFetchedDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  // Fetch logged-in user and files
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
        
        // Fetch the files after confirming user is logged in 
        await fetchRecentFiles();
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    initialize();
  }, [navigate]);

  const handleNewDocument = () => {
    onCreateDoc();
    navigate("/editor");
  };

  const handleOpenExistingDoc = (doc) => {
    onOpenDoc(doc);
    navigate("/editor");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "text/plain", "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png", "image/jpeg",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Unsupported file type.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File is too large.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first.");

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch("http://localhost:8000/api/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      alert("File uploaded successfully");
      setFile(null);
      
      // Refresh the list immediately after upload 
      await fetchRecentFiles();
    } catch (err) {
      console.error(err);
      alert("File upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {user && <div style={{ padding: 20, fontSize: 18, fontWeight: 500 }}>Welcome, {user.username}!</div>}

      <div style={{ backgroundColor: "#f1f3f4", padding: "18px 0 40px 0" }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontSize: 16 }}>Start a new document</span>
          <div style={{ marginTop: 15, display: "flex", gap: 30 }}>
            <div>
              <div
                onClick={handleNewDocument}
                style={{
                  width: 150, height: 190, backgroundColor: "white",
                  border: "1px solid #dadce0", borderRadius: 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 50, color: "#4285f4", cursor: "pointer",
                }}
              >+</div>
              <div style={{ marginTop: 10, fontWeight: 500 }}>Blank document</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>Recent documents</span>
          
          {/* Use fetchedDocuments.length*/}
          {fetchedDocuments.length === 0 ? (
            <div style={{ marginTop: 40, textAlign: "center", color: "#5f6368" }}>
              No documents yet. Create or upload your first document.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 150px)",
                gap: 25, marginTop: 20,
              }}
            >
              {/*Map over fetchedDocuments*/}
              {fetchedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenExistingDoc(doc)}
                  style={{ width: 150, cursor: "pointer" }}
                >
                  <div
                    style={{
                      height: 190, border: "1px solid #dadce0",
                      borderRadius: 4, backgroundColor: "white",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    <span style={{fontSize: "40px"}}>📄</span>
                  </div>
                  <div style={{ padding: "10px 0" }}>
                    {/* Backend uses 'name', size_bytes instead of title/createdAt */}
                    <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#5f6368" }}>
                        {(doc.size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input type="file" id="fileUploadInput" style={{ display: "none" }} onChange={handleFileChange} />
      <img
        src={uploadIcon} alt="Upload"
        onClick={() => document.getElementById("fileUploadInput").click()}
        style={{ position: "fixed", bottom: 30, right: 30, width: 60, height: 60, cursor: "pointer", zIndex: 1000 }}
      />
      
      {file && (
        <button
          onClick={handleUpload} disabled={uploading}
          style={{
            position: "fixed", bottom: 100, right: 30, padding: "10px 20px",
            backgroundColor: "#4285f4", color: "white", border: "none",
            borderRadius: 6, cursor: "pointer", zIndex: 1000,
          }}
        >
          {uploading ? "Uploading..." : `Upload ${file.name}`}
        </button>
      )}
    </div>
  );
};

export default HomeScreen;