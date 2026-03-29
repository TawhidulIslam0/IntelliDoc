/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/file_icon_logo.png";

export default function EditorNavbar({
  activeDoc,
  onRenameDoc,
  saveStatus, 
}) {
  const navigate = useNavigate();

  // Local input state for document name (UI-only state)
  const [displayName, setDisplayName] = useState("");

  // Sync navbar input when switching documents or after a rename is confirmed
  useEffect(() => {
    const nameToDisplay = activeDoc?.name || activeDoc?.title || "";
    setDisplayName(nameToDisplay.replace(/\.idoc$/, ""));
  }, [activeDoc]);

  // Update local UI immediately while typing (No API calls yet)
  const handleChange = (e) => {
    setDisplayName(e.target.value);
  };

  //trigger the backend save when the user clicks away (Blur) or presses Enter
  const handleFinalizeRename = () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) return;
    onRenameDoc(`${trimmedName}.idoc`);
  };

  return (
    <header style={{
      height: "64px",
      backgroundColor: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      borderBottom: "1px solid #E5E7EB",
    }}>
      
      {/* Left side: logo + document title editor */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        
        {/* Click logo to return home */}
        <div onClick={() => navigate("/")} style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}>
          <img src={logo} alt="logo" style={{ width: "28px", height: "28px" }} />
        </div>

        {/* Document title + save status */}
        {activeDoc && (
          <div style={{ display: "flex", alignItems: "center" }}>
            
            {/* Editable document name */}
            <input
              value={displayName}
              onChange={handleChange}
              onBlur={handleFinalizeRename} // SAVE TO DATABASE HERE
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur(); // Triggers onBlur logic
              }}
              placeholder="Untitled Document"
              style={{
                fontSize: "18px",
                fontWeight: "500",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid transparent",
                backgroundColor: "transparent",
                outline: "none",
                cursor: "text",
                marginLeft: "10px",
                minWidth: "200px",
              }}
            />

            {/* Save status indicator */}
            <div style={{
              marginLeft: "15px",
              fontSize: "14px",
              color: "#5F6368",
            }}>
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "☁ saved"}
              {saveStatus === "error" && "⚠ error"}
            </div>
          </div>
        )}
      </div>

      {/* Right side implement in future such as(share, settings, etc.) */}
      <div />
    </header>
  );
}