import React, { useState } from "react";

export default function Navbar({ profile, setProfile }) {
  const [title, setTitle] = useState("Untitled Document");

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderBottom: "1px solid #E5E7EB",
        justifyContent: "space-between",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* Left Side */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* App Name */}
        <div
          style={{
            fontSize: "22px",
            color: "#2563EB",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}
        >
          IntelliDoc
        </div>

        {/* Editable Document Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            border: "1px solid transparent",
            fontSize: "18px",
            padding: "6px 10px",
            borderRadius: "6px",
            outline: "none",
            transition: "all 0.2s ease",
            backgroundColor: "transparent",
          }}
          onFocus={(e) => {
            e.target.style.border = "1px solid #2563EB";
            e.target.style.backgroundColor = "#F9FAFB";
          }}
          onBlur={(e) => {
            e.target.style.border = "1px solid transparent";
            e.target.style.backgroundColor = "transparent";
          }}
        />
      </div>

      {/* Right Side: Profile Switch */}
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
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.backgroundColor = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.backgroundColor = "transparent";
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