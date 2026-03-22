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

  const navigate = useNavigate();

  // Persist documents and activeDoc
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (activeDoc) sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    else sessionStorage.removeItem("activeDoc");
  }, [activeDoc]);

  // Fetch current user
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
        console.error(err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Reset activeDoc if profile switches
  useEffect(() => {
    if (activeDoc && activeDoc.profileId !== currentProfile?.id) {
      setActiveDoc(null);
    }
  }, [currentProfile, activeDoc]);

  // Create a new document for the current profile
  const handleCreateDoc = () => {
    if (!currentProfile) return;
    const newDoc = {
      id: Date.now(),
      title: "Untitled Document",
      createdAt: new Date().toLocaleDateString(),
      profileId: currentProfile.id,
      profileName: currentProfile.name,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDoc(newDoc);
    navigate("/editor");
  };

  const handleOpenDoc = (doc) => {
    setActiveDoc(doc);
    navigate("/editor");
  };

  const handleRenameDoc = (newTitle) => {
    if (!activeDoc) return;
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDoc.id ? { ...doc, title: newTitle } : doc
      )
    );
    setActiveDoc((prev) => (prev ? { ...prev, title: newTitle } : prev));
  };

  // Landing route
  const Landing = () => {
    if (!currentUser) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
  };

  if (loading || profileLoading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/oauth-success"
          element={<OAuthSuccess />}
        />

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
                />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              {activeDoc && currentProfile ? (
                <>
                  <EditorNavbar activeDoc={activeDoc} onRenameDoc={handleRenameDoc} />
                  <Toolbar />
                  <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar />
                    <Editor profile={currentProfile} document={activeDoc} />
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