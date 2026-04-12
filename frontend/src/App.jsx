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

  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [currentContent, setCurrentContent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");

  const navigate = useNavigate();
  const location = useLocation();

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

  const getDocById = (docId) => {
    if (!docId) return null;
    return documents.find(
      (d) => String(d.id || d.file_id) === String(docId)
    );
  };

  const urlId = location.pathname.split("/editor/")[1];

  useEffect(() => {
    if (!urlId || !documents.length) return;
    const doc = getDocById(urlId);
    if (doc && (!activeDoc || String(activeDoc.id || activeDoc.file_id) !== String(urlId))) {
      setActiveDoc(doc);
    }
  }, [urlId, documents]);

  useEffect(() => {
    let isMounted = true; 

    const fetchTabs = async () => {
      if (!urlId) return;

      setTabs([]); 
      setActiveTabId(null);

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://127.0.0.1:8000/api/files/${urlId}/tabs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          setTabs(data);
          if (data.length > 0) {
            setActiveTabId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tabs:", err);
      }
    };

    fetchTabs();

    return () => {
      isMounted = false; 
    };
  }, [urlId]); 

  const handleOpenDoc = (doc) => {
    const docId = doc.id || doc.file_id;
    if (!docId) return;
    setActiveDoc(doc);
    navigate(`/editor/${docId}`);
  };

  const handleRenameDoc = async (newName) => {
    if (!activeDoc || !newName.trim()) return;

    setSaveStatus("saving");
    const docId = activeDoc.id || activeDoc.file_id;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/files/${docId}/rename`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Failed to update title");

      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          String(doc.id || doc.file_id) === String(docId)
            ? { ...doc, name: newName }
            : doc
        )
      );

      setActiveDoc((prev) => (prev ? { ...prev, name: newName } : prev));
      setSaveStatus("saved");
    } catch (err) {
      console.error("Rename failed:", err);
      setSaveStatus("error");
    }
  };

  const Landing = () => {
    if (!currentUser) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
  };

  if (loading || profileLoading) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Initializing...</div>;
  }

  const currentDoc = getDocById(urlId) || activeDoc;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

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

        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              {currentProfile && urlId ? (
                <>
                  <EditorNavbar
                    activeDoc={currentDoc || { id: urlId, name: "Loading..." }}
                    onRenameDoc={handleRenameDoc}
                    saveStatus={saveStatus}
                  />
                  <Toolbar />
                  <div style={{ display: "flex", flex: 1 }}>
                    <Sidebar 
                      fileId={urlId} 
                      tabs={tabs} 
                      setTabs={setTabs} 
                      activeTabId={activeTabId} 
                      setActiveTabId={setActiveTabId} 
                      // Pass currentContent to Sidebar
                      currentContent={currentContent} 
                    />
                    <Editor
                      key={urlId} 
                      document={currentDoc || { id: urlId }}
                      setSaveStatus={setSaveStatus}
                      activeTabId={activeTabId}
                      tabs={tabs}
                      // Connect the content change to the parent state
                      onContentChange={(content) => setCurrentContent(content)}
                      onDocUpdate={(updatedDoc) => {
                        if (String(updatedDoc.id || updatedDoc.file_id) === String(urlId)) {
                          setDocuments(prev => prev.map(d => 
                            String(d.id || d.file_id) === String(urlId) ? { ...d, ...updatedDoc } : d
                          ));
                        }
                      }}
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