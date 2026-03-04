import React from "react";
import { useNavigate } from "react-router-dom";

const HomeScreen = ({ documents = [], onCreateDoc, onOpenDoc }) => {
  const navigate = useNavigate();

  const handleNewDocument = () => {
    const doc = onCreateDoc();
    navigate("/editor");
  };

  const handleOpenExistingDoc = (doc) => {
    onOpenDoc(doc);
    navigate("/editor");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* New Document Section */}
      <div style={{ backgroundColor: "#f1f3f4", padding: "18px 0 40px 0" }}>
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <span style={{ fontSize: "16px" }}>Start a new document</span>

          <div style={{ marginTop: "15px" }}>
            <div
              onClick={handleNewDocument}
              style={{
                width: "150px",
                height: "190px",
                backgroundColor: "white",
                border: "1px solid #dadce0",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "50px",
                color: "#4285f4",
                cursor: "pointer",
              }}
            >
              +
            </div>
            <div style={{ marginTop: "10px", fontWeight: "500" }}>Blank document</div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div style={{ flex: 1, padding: "20px 0" }}>
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <span style={{ fontWeight: "500", fontSize: "16px" }}>Recent documents</span>

          {documents.length === 0 ? (
            <div style={{ marginTop: "40px", textAlign: "center", color: "#5f6368" }}>
              No documents yet. Create your first document above.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 150px)",
                gap: "25px",
                marginTop: "20px",
              }}
            >
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenExistingDoc(doc)}
                  style={{ width: "150px", cursor: "pointer" }}
                >
                  <div
                    style={{
                      height: "190px",
                      border: "1px solid #dadce0",
                      borderRadius: "4px",
                      backgroundColor: "white",
                    }}
                  />
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ fontWeight: "500" }}>{doc.title}</div>
                    <div style={{ fontSize: "12px", color: "#5f6368" }}>
                      Opened {doc.createdAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;