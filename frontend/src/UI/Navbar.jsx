import React from "react";

export default function Navbar({ profile, setProfile }) {
  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid #E5E7EB",
        justifyContent: "space-between",
      }}
    >
      {/* Left side: App name + document title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            fontSize: "22px",
            color: "#2563EB",
            fontWeight: "bold",
          }}
        >
          IntelliDoc
        </div>

        {/* Editable file name (will later connect to backend) */}
        <input
          defaultValue="Untitled Document"
          style={{
            border: "none",
            fontSize: "18px",
            padding: "4px 8px",
            borderRadius: "4px",
            outline: "none",
          }}
        />
      </div>

      {/* Right side: Profile switch buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {["Personal", "School", "Work"].map((p) => (
          <button
            key={p}
            onClick={() => setProfile(p)} // Update active profile
            style={{
              padding: "6px 16px",
              backgroundColor: p === profile ? "#E0E7FF" : "transparent",
              color: p === profile ? "#1E40AF" : "#374151",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </header>
  );
}