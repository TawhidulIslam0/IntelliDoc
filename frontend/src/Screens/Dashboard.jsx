import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import uploadIcon from "../assets/uploadbutton.png"; // floating button

const HomeScreen = ({ documents = [], onCreateDoc, onOpenDoc }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

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

    fetchUser();
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

    // Restrict file types
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Unsupported file type. Please upload PDF, DOCX, TXT, PNG, or JPG.");
      return;
    }

    //  limit size ( 10 MB) for now
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
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
    } catch (err) {
      console.error(err);
      alert("File upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* User Greeting */}
      {user && <div style={{ padding: 20, fontSize: 18, fontWeight: 500 }}>Welcome, {user.username}!</div>}

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
              <div style={{ marginTop: 10, fontWeight: 500 }}>Blank document</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>Recent documents</span>
          {documents.length === 0 ? (
            <div style={{ marginTop: 40, textAlign: "center", color: "#5f6368" }}>
              No documents yet. Create your first document above.
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
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenExistingDoc(doc)}
                  style={{ width: 150, cursor: "pointer" }}
                >
                  <div
                    style={{
                      height: 190,
                      border: "1px solid #dadce0",
                      borderRadius: 4,
                      backgroundColor: "white",
                    }}
                  />
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ fontWeight: 500 }}>{doc.title}</div>
                    <div style={{ fontSize: 12, color: "#5f6368" }}>Opened {doc.createdAt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Upload Button */}
      <input
        type="file"
        id="fileUploadInput"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
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
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            position: "fixed",
            bottom: 100,
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
    </div>
  );
};

export default HomeScreen;