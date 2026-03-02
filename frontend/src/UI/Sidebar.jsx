import React from "react";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "white",
        padding: "16px",
        borderRight: "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          color: "#444746",
          fontWeight: "500",
          marginBottom: "12px",
        }}
      >
        Outline
      </div>
        
      <div style={{ fontSize: "13px", color: "#707070" }}>
        Headings you add to the document will appear here.
      </div>
    </aside>
  );
}