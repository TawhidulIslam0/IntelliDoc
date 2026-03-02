import React, { useState } from "react";

// Import UI components from the ui folder
import Navbar from "./UI/Navbar";
import Toolbar from "./UI/Toolbar";
import Sidebar from "./UI/Sidebar";
import Editor from "./UI/Editor";

export default function App() {
  // Global state: keeps track of which profile is active
  const [profile, setProfile] = useState("Personal");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F9FBFD",
      }}
    >
      {/* Top navigation bar */}
      <Navbar profile={profile} setProfile={setProfile} />

      {/* Formatting toolbar */}
      <Toolbar />

      {/* Main content area (Sidebar + Editor) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Editor profile={profile} />
      </div>
    </div>
  );
}