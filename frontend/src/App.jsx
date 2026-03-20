import React, { useState, useEffect, useContext } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import DashboardNavbar from "./UI/DashboardNavbar";
import EditorNavbar from "./UI/EditorNavbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";
import HomeScreen from "./Screens/Dashboard";

import Login from "./Screens/Login";
import Signup from "./Screens/Signup";
import ChooseProfile from "./Screens/ChooseProfile"; // <-- import ChooseProfile
import ProtectedRoute from "./auth/ProtectedRoute";

import { ProfileContext } from "./UI/ProfileContext"; // use context

export default function App() {
  const { currentProfile } = useContext(ProfileContext); // get profile from context
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(
    () => JSON.parse(sessionStorage.getItem("activeDoc")) || null
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // loading while checking auth

  const navigate = useNavigate();

  // Persist active document in sessionStorage
  useEffect(() => {
    if (activeDoc) {
      sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    } else {
      sessionStorage.removeItem("activeDoc");
    }
  }, [activeDoc]);

  // Load documents from localStorage on mount
  useEffect(() => {
    const storedDocs = JSON.parse(localStorage.getItem("documents"));
    if (storedDocs) setDocuments(storedDocs);
  }, []);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  // Fetch current user if token exists
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

  // Document handlers
  const handleCreateDoc = () => {
    const newDoc = {
      id: Date.now(),
      title: "Untitled Document",
      createdAt: new Date().toLocaleDateString(),
      profile: currentProfile,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDoc(newDoc);
    navigate("/editor"); // redirect to editor immediately
  };

  const handleOpenDoc = (doc) => {
    setActiveDoc(doc);
    navigate("/editor"); // redirect to editor when opening
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

  // Landing route decides where to go
  const Landing = () => {
    if (!currentUser) return <Navigate to="/signup" replace />; // new users go to signup
    // If user has profile, go to dashboard, otherwise choose profile
    return currentProfile ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/choose-profile" replace />
    );
  };

  // Show loading until auth check completes
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  // App Routes
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        {/* Root route */}
        <Route path="/" element={<Landing />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* SIGNUP */}
        <Route path="/signup" element={<Signup />} />

        {/* CHOOSE PROFILE */}
        <Route
          path="/choose-profile"
          element={
            <ProtectedRoute>
              <ChooseProfile />
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD - protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <DashboardNavbar user={currentUser} />
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
                    activeDoc={activeDoc}
                    onRenameDoc={handleRenameDoc}
                  />
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