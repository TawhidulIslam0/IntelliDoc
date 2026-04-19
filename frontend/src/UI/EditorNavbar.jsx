/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/file_icon_logo.png";

export default function EditorNavbar({
  activeDoc,
  onRenameDoc, // This is the function passed from Editor.jsx
  saveStatus, 
}) {
  const navigate = useNavigate();

  // Local state for the input field
  const [displayName, setDisplayName] = useState("");

  //  Initial Load & External Sync
  // If the doc changes (or is renamed from the sidebar), update the input field
  useEffect(() => {
    if (activeDoc) {
      const nameToDisplay = activeDoc.name || activeDoc.title || "Untitled Document";
      const cleanName = nameToDisplay.replace(/\.idoc$/, "");
      setDisplayName(cleanName);
      
      // Also sync the browser tab title
      document.title = `${cleanName} - IntelliDoc`;
    }
  }, [activeDoc?.id, activeDoc?.name]); 

  //  Handle typing 
  const handleChange = (e) => {
    setDisplayName(e.target.value);
  };

  // Finalize Rename (Triggers Backend Save)
  // This runs on Blur (clicking away) or pressing Enter
  const handleFinalizeRename = () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      // Reset to original name if user leaves it empty
      setDisplayName((activeDoc?.name || "").replace(/\.idoc$/, ""));
      return;
    }
    
    const currentName = (activeDoc?.name || activeDoc?.title || "").replace(/\.idoc$/, "");
    
    if (trimmedName !== currentName) {
      //  append the extension back for the backend/database
      onRenameDoc(`${trimmedName}.idoc`);
    }
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
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        
        <div 
          onClick={() => navigate("/")} 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <img src={logo} alt="logo" style={{ width: "28px", height: "28px" }} />
        </div>

        {activeDoc && (
          <div style={{ display: "flex", alignItems: "center" }}>
            
            <input
              value={displayName}
              onChange={handleChange}
              onBlur={handleFinalizeRename} // Saves when user clicks away
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur(); // Forces onBlur to trigger save
                }
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
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#F3F4F6")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "transparent")}
              onFocus={(e) => (e.target.style.border = "1px solid #4285f4")}
            />

            <div style={{
              marginLeft: "15px",
              fontSize: "14px",
              color: "#5F6368",
              fontStyle: "italic"
            }}>
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "☁ saved"}
              {saveStatus === "error" && "⚠ error"}
            </div>
          </div>
        )}
      </div>

      <div />
    </header>
  );
}