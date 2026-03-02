import React from "react";

export default function Editor({ profile }) {
  return (
    <main
      style={{
        flex: 1,
        backgroundColor: "#F9FBFD",
        overflowY: "auto",
        display: "flex",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* White "paper" area */}
      <div
        style={{
          width: "816px",
          minHeight: "1056px",
          backgroundColor: "white",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          padding: "96px",
          outline: "none",
          fontSize: "16px",
          lineHeight: "1.5",
          color: "#1f2937",
        }}
        contentEditable
        suppressContentEditableWarning={true}
      >
        Start typing your <strong>{profile}</strong> notes here...
      </div>
    </main>
  );
}