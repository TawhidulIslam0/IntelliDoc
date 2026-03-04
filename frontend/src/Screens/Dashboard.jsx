import React from "react";

const HomeScreen = ({ onOpenDoc }) => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      
      {/* Template Gallery Section */}
      <div style={{ backgroundColor: "#f1f3f4", padding: "18px 0 40px 0" }}>
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <span style={{ fontSize: "16px", color: "#202124" }}>Start a new document</span>
            <div style={{ fontSize: "14px", color: "#5f6368", cursor: "pointer" }}>Template gallery ↕</div>
          </div>
          
          <div style={{ display: "flex", gap: "18px" }}>
            {[
              { label: "Blank document", color: "#fff", icon: "+" },
              { label: "Project proposal", color: "#fff", img: "📜" },
              { label: "Resume", color: "#fff", img: "📄" },
              { label: "Letter", color: "#fff", img: "✉️" },
              { label: "Report", color: "#fff", img: "📊" }
            ].map((item, i) => (
              <div key={i} onClick={onOpenDoc} style={{ cursor: "pointer" }}>
                <div style={{ 
                  width: "150px", 
                  height: "190px", 
                  backgroundColor: "white", 
                  border: "1px solid #dadce0", 
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: i === 0 ? "50px" : "30px",
                  color: i === 0 ? "#4285f4" : "#ccc"
                }}>
                  {item.icon || item.img}
                </div>
                <div style={{ marginTop: "10px", fontSize: "14px", fontWeight: "500", color: "#202124" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div style={{ flex: 1, padding: "20px 0" }}>
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ fontWeight: "500", fontSize: "16px" }}>Recent documents</span>
            <div style={{ display: "flex", gap: "20px", color: "#5f6368", fontSize: "14px" }}>
              <span>Owned by anyone ▼</span>
              <span>AZ</span>
              <span>📁</span>
            </div>
          </div>

          {/* Grid of Docs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 150px)", gap: "25px", marginTop: "20px" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} onClick={onOpenDoc} style={{ width: "150px", cursor: "pointer" }}>
                <div style={{ 
                  height: "190px", 
                  border: "1px solid #dadce0", 
                  borderRadius: "4px", 
                  backgroundColor: "white",
                  padding: "15px",
                  overflow: "hidden"
                }}>
                   <div style={{ height: "2px", width: "80%", backgroundColor: "#eee", marginBottom: "8px" }} />
                   <div style={{ height: "2px", width: "100%", backgroundColor: "#eee", marginBottom: "8px" }} />
                   <div style={{ height: "2px", width: "90%", backgroundColor: "#eee", marginBottom: "8px" }} />
                </div>
                <div style={{ padding: "10px 0" }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Untitled document
                  </div>
                  <div style={{ fontSize: "12px", color: "#5f6368", display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                    <span style={{ color: "#4285f4" }}>📄</span> Opened Mar 1, 2026
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;