import React from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/file_icon_logo.png";

export default function EditorNavbar({
  activeDoc,
  onRenameDoc,
}) {
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      {/* LEFT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/*  Clickable Logo (acts like "back to dashboard") */}
        <div
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <img
            src={logo}
            alt="logo"
            style={{ width: "28px", height: "28px" }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: "500",
              color: "#5F6368", 
            }}
          >

          </span>
        </div>

        {/* Document Title */}
        {activeDoc && (
          <input
            value={activeDoc.title}
            onChange={(e) => onRenameDoc(e.target.value)}
            placeholder="Untitled Document"
            style={{
              fontSize: "18px",
              fontWeight: "500",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid transparent",
              backgroundColor: "transparent",
              outline: "none",
              transition: "all 0.2s ease",
              cursor: "text",
              marginLeft: "10px",
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = "#F1F3F4";
              e.target.style.border = "1px solid #DADCE0";
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.border = "1px solid transparent";
            }}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                e.target.style.backgroundColor = "#F8F9FA";
              }
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.target) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          />
        )}
      </div>

      {/* RIGHT SECTION (empty for now)*/}
      <div />
    </header>
  );
}