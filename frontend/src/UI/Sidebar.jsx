import React, { useState } from "react";
import { MoreVertical } from "lucide-react";

export default function Sidebar() {
  const [tabs, setTabs] = useState([{ id: 1, title: "Tab 1", subtabs: [] }]);
  const [activeTab, setActiveTab] = useState(1);
  const [showOutline, setShowOutline] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const addTab = () => {
    const newId = Date.now();
    const newTitle = `Tab ${tabs.length + 1}`;
    setTabs([...tabs, { id: newId, title: newTitle, subtabs: [] }]);
    setActiveTab(newId);
  };

  const renameTab = (id) => {
    const tab = tabs.find((t) => t.id === id);
    const newTitle = prompt("Rename document:", tab.title);
    if (!newTitle) return;
    setTabs(tabs.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));
  };

  const duplicateTab = (id) => {
    const tab = tabs.find((t) => t.id === id);
    const newId = Date.now();
    setTabs([...tabs, { id: newId, title: `${tab.title} Copy`, subtabs: [...tab.subtabs] }]);
  };

  const addSubtab = (id) => {
    const tab = tabs.find((t) => t.id === id);
    const subtabName = prompt("Subtab name:");
    if (!subtabName) return;
    tab.subtabs.push(subtabName);
    setTabs([...tabs]);
  };

  const deleteTab = (id) => {
    setTabs(tabs.filter((t) => t.id !== id));
    if (activeTab === id && tabs.length > 1) setActiveTab(tabs[0].id);
  };

  const moveTab = (id, direction) => {
    const index = tabs.findIndex((t) => t.id === id);
    if (direction === "up" && index > 0) {
      const newTabs = [...tabs];
      [newTabs[index - 1], newTabs[index]] = [newTabs[index], newTabs[index - 1]];
      setTabs(newTabs);
    } else if (direction === "down" && index < tabs.length - 1) {
      const newTabs = [...tabs];
      [newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
      setTabs(newTabs);
    }
  };

  const moveInto = (id) => {
    const tab = tabs.find((t) => t.id === id);
    const parentId = parseInt(prompt("Enter parent tab number to move into (e.g., 1):"));
    const parentTab = tabs.find((t) => t.id === parentId);
    if (!parentTab || tab.id === parentTab.id) return;
    parentTab.subtabs.push(tab.title);
    setTabs(tabs.filter((t) => t.id !== id));
  };

  return (
    <aside
      className="sidebar" /* Added this to match Print.css */
      style={{
        width: "240px",
        backgroundColor: "#f8f9fa",
        borderRight: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "12px",
      }}
    >
      {tabs.map((tab) => (
        <div key={tab.id} style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: tab.id === activeTab ? "#E0E7FF" : "white",
              borderRadius: "6px",
              padding: "6px 8px",
              cursor: "pointer",
              border: "1px solid #D1D5DB",
              fontWeight: tab.id === activeTab ? 500 : 400,
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.title}</span>

            <div style={{ position: "relative" }}>
              <button
                onMouseDown={(e) => e.preventDefault()} /* Keeps focus on doc */
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === tab.id ? null : tab.id);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6B7280" }}
              >
                <MoreVertical size={16} />
              </button>

              {menuOpenId === tab.id && (
                <div
                  style={{
                    position: "absolute",
                    top: "24px",
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    zIndex: 10,
                    minWidth: "160px",
                  }}
                >
                  {tab.id === 1 ? (
                    <>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => addSubtab(tab.id)}>Add Subtab</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => duplicateTab(tab.id)}>Duplicate</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => renameTab(tab.id)}>Rename</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer" }} onClick={() => setShowOutline(!showOutline)}>
                        {showOutline ? "Hide Outline" : "Show Outline"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => addSubtab(tab.id)}>Add Subtab</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => duplicateTab(tab.id)}>Duplicate</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => renameTab(tab.id)}>Rename</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => deleteTab(tab.id)}>Delete</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => moveTab(tab.id, "up")}>Move Up</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #E5E7EB" }} onClick={() => moveTab(tab.id, "down")}>Move Down</div>
                      <div style={{ padding: "6px 12px", cursor: "pointer" }} onClick={() => moveInto(tab.id)}>Move Into</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subtabs */}
          {tab.subtabs.map((sub, idx) => (
            <div key={idx} style={{ padding: "4px 16px", fontSize: "13px", color: "#4B5563", cursor: "pointer" }}>
              {sub}
            </div>
          ))}
        </div>
      ))}

      <button
        onMouseDown={(e) => e.preventDefault()} /* Keeps focus on doc */
        onClick={addTab}
        style={{
          marginTop: "8px",
          padding: "6px 12px",
          borderRadius: "6px",
          backgroundColor: "white",
          border: "1px dashed #9CA3AF",
          cursor: "pointer",
          fontWeight: 500,
          color: "#6B7280",
        }}
      >
        + New Tab
      </button>

      {showOutline && (
        <div style={{ marginTop: "24px", fontSize: "14px", color: "#6B7280" }}>
          Headings you add to the document will appear here.
        </div>
      )}
    </aside>
  );
}