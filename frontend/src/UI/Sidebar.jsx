/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Plus, Copy, Type, Trash2, List, ChevronRight, FileText } from "lucide-react";
import * as fileService from "../api/fileService";

export default function Sidebar({ fileId, tabs, setTabs, activeTabId, setActiveTabId, currentContent }) {
  const [showOutline, setShowOutline] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const syncLocalTabs = () => {
    if (!currentContent || !activeTabId) return;
    setTabs(prev => prev.map(t => 
      String(t.id) === String(activeTabId) ? { ...t, content: currentContent } : t
    ));
  };

  const handleAddTab = async () => {
    try {
      syncLocalTabs(); // Ensure current UI state is reflected locally before adding
      const newTab = await fileService.createTab(fileId);
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setMenuOpenId(null);
    } catch (error) {
      console.error("Creation failed:", error);
    }
  };

  const handleDuplicateTab = async (tabId) => {
    try {
      setMenuOpenId(null);
      // If duplicating the active tab, ensure our local list has the latest content first
      if (String(activeTabId) === String(tabId)) {
        syncLocalTabs();
      }

      const duplicated = await fileService.duplicateTab(fileId, tabId);
      setTabs(prev => [...prev, duplicated]);
      setActiveTabId(duplicated.id);
    } catch (error) {
      console.error("Duplication failed:", error);
    }
  };

  const handleRenameTab = async (id, currentTitle) => {
    const newTitle = prompt("Enter new name:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    try {
      const updatedTab = await fileService.updateTab(id, { name: newTitle });
      setTabs((prevTabs) =>
        prevTabs.map((t) => (t.id === id ? { ...t, name: updatedTab.name } : t))
      );
      setMenuOpenId(null);
    } catch (error) {
      alert("Failed to rename.");
    }
  };

  const handleDeleteTab = async (id) => {
    if (tabs.length <= 1) {
      alert("You must have at least one tab.");
      return;
    }

    try {
      await fileService.deleteTab(id);
      const remaining = tabs.filter((t) => t.id !== id);
      setTabs(remaining);

      if (activeTabId === id && remaining.length > 0) {
        setActiveTabId(remaining[0].id);
      }
      setMenuOpenId(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const renderTabItem = (tab, isFirst = false) => {
    const isActive = tab.id === activeTabId;
    return (
      <div key={tab.id} style={styles.tabWrapper}>
        <div
          onClick={() => {
            if (!isActive) {
              syncLocalTabs(); // Sync UI state before moving away
              setActiveTabId(tab.id);
            }
          }}
          style={{
            ...styles.tabItem,
            backgroundColor: isActive ? "#E8F0FE" : "transparent",
            color: isActive ? "#1967D2" : "#3C4043",
          }}
        >
          {isActive && <div style={styles.activeIndicator} />}
          <div style={styles.tabLabelGroup}>
            <FileText size={18} style={{ marginRight: "12px", opacity: 0.8 }} />
            <span style={{ ...styles.tabName, fontWeight: isActive ? "500" : "400" }}>
              {tab.name || `Tab ${tab.id}`}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Capture click position for Portal
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160
                });
                setMenuOpenId(menuOpenId === tab.id ? null : tab.id);
              }}
              style={styles.menuButton}
            >
              <MoreVertical size={16} />
            </button>
            {/* PORTAL MENU */}
            {menuOpenId === tab.id &&
              createPortal(
                <div style={{ ...styles.dropdown, position: "fixed", top: menuPosition.top, left: menuPosition.left }} ref={menuRef}>
                  <div style={styles.menuItem} onClick={(e) => { e.stopPropagation(); handleDuplicateTab(tab.id); }}>
                    <Copy size={14} /> Duplicate
                  </div>
                  <div style={styles.menuItem} onClick={(e) => { e.stopPropagation(); handleRenameTab(tab.id, tab.name); }}>
                    <Type size={14} /> Rename
                  </div>
                  {!isFirst && (
                    <>
                      <div style={styles.divider} />
                      <div style={{ ...styles.menuItem, color: "#D93025" }} onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id); }}>
                        <Trash2 size={14} /> Delete
                      </div>
                    </>
                  )}
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.headerRow}>
        <p style={styles.sectionHeader}>Document tabs</p>
        <button onClick={handleAddTab} style={styles.iconAddBtn}>
          <Plus size={18} />
        </button>
      </div>
      <div className="custom-scrollbar" style={styles.tabList}>
        {tabs.map((tab, index) => renderTabItem(tab, index === 0))}
      </div>
      <div style={styles.outlineSection}>
        <div style={styles.outlineHeader} onClick={() => setShowOutline(!showOutline)}>
          <List size={16} />
          <span style={{ flex: 1 }}>Outline</span>
          <ChevronRight size={14} style={{ transform: showOutline ? "rotate(90deg)" : "rotate(0deg)", transition: "0.2s" }} />
        </div>
        {showOutline && <div style={styles.outlineContent}>Headings you add to the document will appear here.</div>}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </aside>
  );
}

const styles = {
  sidebar: { width: "260px", backgroundColor: "#fff", borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column", padding: "16px 0px", height: "100%" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 12px 16px" },
  sectionHeader: { fontSize: "14px", color: "#3C4043", margin: 0 },
  iconAddBtn: { background: "none", border: "none", cursor: "pointer", color: "#5F6368", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center" },
  tabList: { flex: 1, overflowY: "auto" },
  tabWrapper: { paddingRight: "8px" },
  tabItem: { position: "relative", display: "flex", alignItems: "center", padding: "0 12px 0 16px", height: "40px", borderRadius: "0 24px 24px 0", cursor: "pointer", margin: "2px 0" },
  tabLabelGroup: { display: "flex", alignItems: "center", flex: 1 },
  activeIndicator: { position: "absolute", left: 0, height: "24px", width: "4px", backgroundColor: "#1967D2" },
  tabName: { fontSize: "14px" },
  menuButton: { background: "none", border: "none", cursor: "pointer", display: "flex", padding: "6px" },

  dropdown: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    zIndex: 9999,
    width: "160px",
    padding: "6px 0"
  },

  menuItem: { padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: "#3C4043" },
  divider: { height: "1px", backgroundColor: "#e0e0e0", margin: "4px 0" },
  outlineSection: { marginTop: "auto", borderTop: "1px solid #e0e0e0", padding: "16px" },
  outlineHeader: { display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", cursor: "pointer" },
  outlineContent: { fontSize: "12px", color: "#70757a", marginTop: "16px" },
};