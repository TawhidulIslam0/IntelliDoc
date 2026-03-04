import React from "react";

export default function DashboardNavbar({ profile, setProfile }) {
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
      {/* Left: App Name */}
      <div
        style={{
          fontSize: "22px",
          color: "#2563EB",
          fontWeight: "700",
        }}
      >
        IntelliDoc
      </div>

      {/* Right: Profile Switch */}
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