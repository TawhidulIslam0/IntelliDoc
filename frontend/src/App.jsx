/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useContext } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

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
import { createBlankDoc } from "./api/fileService"; 

export default function App() {
  const { currentProfile, loading: profileLoading } = useContext(ProfileContext);

  // Local state for documents 
  const [documents, setDocuments] = useState(() => {
    return JSON.parse(localStorage.getItem("documents")) || [];
  });

  // Track the document currently being edited
  const [activeDoc, setActiveDoc] = useState(() => {
    return JSON.parse(sessionStorage.getItem("activeDoc")) || null;
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");

  const navigate = useNavigate();

  // Keep LocalStorage in sync for persistence
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (activeDoc) {
      sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    } else {
      sessionStorage.removeItem("activeDoc");
    }
  }, [activeDoc]);

  // Fetch current user on mount
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

  // If profile changes, close any active doc from the old profile
  useEffect(() => {
    if (activeDoc && activeDoc.profileId !== currentProfile?.id) {
      setActiveDoc(null);
    }
  }, [currentProfile, activeDoc]);

  // Create Documents
  const handleCreateDoc = async () => {
    if (!currentProfile) return;

    try {
      setSaveStatus("saving");
      
      //  Create entry in Database and S3
      const result = await createBlankDoc("Untitled Document.idoc", currentProfile.id);
      
      // Handle the UUID returned by your FastAPI backend
      const serverId = result.file_id || result.id;

      const newDoc = {
        id: serverId,
        title: "Untitled Document",
        createdAt: new Date().toLocaleDateString(),
        profileId: currentProfile.id,
        profileName: currentProfile.name,
        content: { pages: [""] },
      };

      // Set as Active 
      setActiveDoc(newDoc);
      setSaveStatus("saved");
      
      // Navigate directly to the editor using the new ID
      navigate(`/editor/${serverId}`);
    } catch (err) {
      console.error("Failed to create document on server:", err);
      setSaveStatus("error");
      alert("Error: Could not create document on the server.");
    }
  };

  const handleOpenDoc = (doc) => {
    setActiveDoc(doc);
    navigate(`/editor/${doc.id}`);
  };

  const handleRenameDoc = (newTitle) => {
    if (!activeDoc) return;
    setSaveStatus("saving");

    // Update local states
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDoc.id ? { ...doc, title: newTitle } : doc
      )
    );
    setActiveDoc((prev) =>
      prev ? { ...prev, title: newTitle } : prev
    );

    setTimeout(() => setSaveStatus("saved"), 800);
  };

  const Landing = () => {
    if (!currentUser) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
  };

  if (loading || profileLoading) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading Profile...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        
        {/* DASHBOARD ROUTE */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <DashboardNavbar user={currentUser} />
                <HomeScreen
                  documents={documents.filter(
                    (doc) => doc.profileId === currentProfile?.id
                  )}
                  onCreateDoc={handleCreateDoc}
                  onOpenDoc={handleOpenDoc}
                  user={currentUser}
                  setDocuments={setDocuments} 
                />
              </>
            </ProtectedRoute>
          }
        />

        {/* EDITOR ROUTE */}
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              {activeDoc?.id && currentProfile ? (
                <>
                  <EditorNavbar
                    activeDoc={activeDoc}
                    onRenameDoc={handleRenameDoc}
                    saveStatus={saveStatus}
                  />
                  <Toolbar />
                  <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar />
                    <Editor
                      document={activeDoc}
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