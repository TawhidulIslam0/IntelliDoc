import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardNavbar from "./UI/DashboardNavbar";
import EditorNavbar from "./UI/EditorNavbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";
import HomeScreen from "./Screens/Dashboard";

export default function App() {
  const [profile, setProfile] = useState("Personal");
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(
    () => JSON.parse(sessionStorage.getItem("activeDoc")) || null
  );

  // Persist active document in sessionStorage
  useEffect(() => {
    if (activeDoc) {
      sessionStorage.setItem("activeDoc", JSON.stringify(activeDoc));
    } else {
      sessionStorage.removeItem("activeDoc");
    }
  }, [activeDoc]);

  // Create new document
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

  // Open existing document
  const handleOpenDoc = (doc) => {
    setActiveDoc(doc);
  };

  // Rename document properly (NO state mutation)
  const handleRenameDoc = (newTitle) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDoc.id ? { ...doc, title: newTitle } : doc
      )
    );

    setActiveDoc((prev) => ({
      ...prev,
      title: newTitle,
    }));
  };

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>

          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <>
                <DashboardNavbar
                  profile={profile}
                  setProfile={setProfile}
                />
                <HomeScreen
                  documents={documents}
                  onCreateDoc={handleCreateDoc}
                  onOpenDoc={handleOpenDoc}
                />
              </>
            }
          />

          {/* EDITOR */}
          <Route
            path="/editor"
            element={
              activeDoc ? (
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
                    <Editor
                      profile={profile}
                      document={activeDoc}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DashboardNavbar
                    profile={profile}
                    setProfile={setProfile}
                  />
                  <HomeScreen
                    documents={documents}
                    onCreateDoc={handleCreateDoc}
                    onOpenDoc={handleOpenDoc}
                  />
                </>
              )
            }
          />

        </Routes>
      </div>
    </BrowserRouter>
  );
}