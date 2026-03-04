import React, { useState } from "react";
import Navbar from "./UI/Navbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";
import HomeScreen from "./Screens/Dashboard";

export default function App() {
  const [profile, setProfile] = useState("Personal");
  
  // Start with 'home' so the Dashboard is the first thing seen
  const [view, setView] = useState("home"); 

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: view === "home" ? "white" : "#F9FBFD" }}>
      
      {/* Navbar stays at the top of both views */}
      <Navbar profile={profile} setProfile={setProfile} setView={setView} />

      {view === "home" ? (
        /* 1. The Entry Point: Dashboard */
        <HomeScreen onOpenDoc={() => setView("editor")} />
      ) : (
        /* 2. The Destination: The Editor Workspace */
        <>
          <Toolbar />
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <Sidebar />
            <Editor profile={profile} />
          </div>
        </>
      )}
    </div>
  );
}