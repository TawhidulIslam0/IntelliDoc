import React from "react";
import { useNavigate } from "react-router-dom";

export default function EditorNavbar({
  profile,
  setProfile,
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
        padding: "0 24px",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* LEFT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: "500",
            color: "#2563EB",
            fontSize: "14px",
          }}
        >
          ← Dashboard
        </button>

        {/* App Name */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#2563EB",
          }}
        >
          IntelliDoc
        </div>

        {/* Editable Document Title */}
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
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = "#F3F4F6";
              e.target.style.border = "1px solid #D1D5DB";
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.border = "1px solid transparent";
            }}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                e.target.style.backgroundColor = "#F9FAFB";
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

      {/* PROFILE SWITCH */}
      <div style={{ display: "flex", gap: "10px" }}>
        {["Personal", "School", "Work"].map((p) => {
          const isActive = p === profile;
          return (
            <button
              key={p}
              onClick={() => setProfile(p)}
              style={{
                padding: "6px 18px",
                backgroundColor: isActive ? "#E0E7FF" : "transparent",
                color: isActive ? "#1E40AF" : "#374151",
                border: "none",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
            >
              {p}
            </button>
          );
        })}
      </div>
    </header>
  );
}