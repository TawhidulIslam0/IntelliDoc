import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import DashboardNavbar from "./UI/DashboardNavbar";
import EditorNavbar from "./UI/EditorNavbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";
import HomeScreen from "./Screens/Dashboard";

import Login from "./Screens/Login";
import Signup from "./Screens/Signup";
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  const [profile, setProfile] = useState("Personal");
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(
    () => JSON.parse(sessionStorage.getItem("activeDoc")) || null
  );
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  // Persist active document
  useEffect(() => {
    if (activeDoc) {
      sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    } else {
      sessionStorage.removeItem("activeDoc");
    }
  }, [activeDoc]);

  // Fetch current user if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

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
      }
    };
    fetchCurrentUser();
  }, [navigate]);

  // Document handlers
  const handleCreateDoc = () => {
    const newDoc = {
      id: Date.now(),
      title: "Untitled Document",
      createdAt: new Date().toLocaleDateString(),
      profile,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDoc(newDoc);
    return newDoc;
  };

  const handleOpenDoc = (doc) => setActiveDoc(doc);

  const handleRenameDoc = (newTitle) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDoc.id ? { ...doc, title: newTitle } : doc
      )
    );
    setActiveDoc((prev) => ({ ...prev, title: newTitle }));
  };

  // Landing route: decide where to go based on user
  const Landing = () => {
    if (currentUser) return <Navigate to="/" replace />;
    return <Navigate to="/signup" replace />; // show signup first for new users
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        {/* Root: landing */}
        <Route path="/" element={<Landing />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* SIGNUP */}
        <Route path="/signup" element={<Signup />} />

        {/* DASHBOARD - protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <DashboardNavbar
                  profile={profile}
                  setProfile={setProfile}
                  user={currentUser}
                />
                <HomeScreen
                  documents={documents}
                  onCreateDoc={handleCreateDoc}
                  onOpenDoc={handleOpenDoc}
                  user={currentUser}
                />
              </>
            </ProtectedRoute>
          }
        />

        {/* EDITOR - protected */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              {activeDoc ? (
                <>
                  <EditorNavbar
                    profile={profile}
                    setProfile={setProfile}
                    activeDoc={activeDoc}
                    onRenameDoc={handleRenameDoc}
                  />
                  <Toolbar />
                  <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar />
                    <Editor profile={profile} document={activeDoc} />
                  </div>
                </>
              ) : (
                <>
                  <DashboardNavbar
                    profile={profile}
                    setProfile={setProfile}
                    user={currentUser}
                  />
                  <HomeScreen
                    documents={documents}
                    onCreateDoc={handleCreateDoc}
                    onOpenDoc={handleOpenDoc}
                    user={currentUser}
                  />
                </>
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}