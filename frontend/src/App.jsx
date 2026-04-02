/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useContext } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import DashboardNavbar from "./UI/DashboardNavbar";
import EditorNavbar from "./UI/EditorNavbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";
import HomeScreen from "./Screens/Dashboard";

import Login from "./Screens/Login";
import Signup from "./Screens/Signup";
import OAuthSuccess from "./Screens/OAuthSuccess";
import ProtectedRoute from "./auth/ProtectedRoute";

import { ProfileContext } from "./UI/ProfileContext";

import "./UI/Print.css";

export default function App() {
  const { currentProfile, loading: profileLoading } = useContext(ProfileContext);

  const [documents, setDocuments] = useState(() => {
    return JSON.parse(localStorage.getItem("documents")) || [];
  });

  const [activeDoc, setActiveDoc] = useState(() => {
    return JSON.parse(sessionStorage.getItem("activeDoc")) || null;
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");

  const navigate = useNavigate();
  const location = useLocation();

  // Persist documents
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  // Persist active document
  useEffect(() => {
    if (activeDoc) {
      sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    } else {
      sessionStorage.removeItem("activeDoc");
    }
  }, [activeDoc]);

  // Fetch user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch user");

        const data = await res.json();
        setCurrentUser(data);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Helper to find document by ID 
  const getDocById = (docId) => {
    if (!docId) return null;
    return documents.find(
      (d) => String(d.id || d.file_id) === String(docId)
    );
  };

  // Sync activeDoc from URL 
  const urlId = location.pathname.split("/editor/")[1];

  useEffect(() => {
    if (!urlId || !documents.length) return;
    const doc = getDocById(urlId);
    if (doc && (!activeDoc || String(activeDoc.id || activeDoc.file_id) !== String(urlId))) {
      setActiveDoc(doc);
    }
  }, [urlId, documents]);

  // Open document from dashboard
  const handleOpenDoc = (doc) => {
    const docId = doc.id || doc.file_id;
    if (!docId) return;
    setActiveDoc(doc);
    navigate(`/editor/${docId}`);
  };

  // Rename document logic
  const handleRenameDoc = async (newName) => {
    if (!activeDoc || !newName.trim()) return;

    setSaveStatus("saving");
    const docId = activeDoc.id || activeDoc.file_id;
    const token = localStorage.getItem("token");

    try {
       // Sync to Backend 
      const res = await fetch(`http://127.0.0.1:8000/api/files/${docId}/title`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Failed to update title");

      // Update local list 
      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          String(doc.id || doc.file_id) === String(docId)
            ? { ...doc, name: newName }
            : doc
        )
      );

       // Update active document 
      setActiveDoc((prev) => (prev ? { ...prev, name: newName } : prev));
      setSaveStatus("saved");
    } catch (err) {
      console.error("Rename failed:", err);
      setSaveStatus("error");
    }
  };

  // Landing redirect
  const Landing = () => {
    if (!currentUser) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
  };

  if (loading || profileLoading) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Initializing...</div>;
  }

  // Determine current document based on URL or State
  const currentDoc = getDocById(urlId) || activeDoc;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <DashboardNavbar user={currentUser} />
                <HomeScreen
                  documents={documents.filter((doc) => doc.profileId === currentProfile?.id)}
                  onOpenDoc={handleOpenDoc}
                  user={currentUser}
                  setDocuments={setDocuments}
                />
              </>
            </ProtectedRoute>
          }
        />

        {/* EDITOR */}
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              {/* check for currentProfile and EITHER a doc or a URL ID  */}
              {currentProfile && (currentDoc || urlId) ? (
                <>
                  <EditorNavbar
                    activeDoc={currentDoc || { id: urlId, name: "" }}
                    onRenameDoc={handleRenameDoc}
                    saveStatus={saveStatus}
                  />
                  <Toolbar />
                  <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar />
                    <Editor
                      document={currentDoc || { id: urlId }}
                      setSaveStatus={setSaveStatus}
                      setActiveDoc={setActiveDoc}
                    />
                  </div>
                </>
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}