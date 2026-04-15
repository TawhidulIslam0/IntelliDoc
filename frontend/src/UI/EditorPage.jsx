/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Editor from "./Editor";
import * as fileService from "../api/fileService";

export default function EditorPage() {
  const { docId } = useParams(); 
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  
  // Track live content without forcing heavy Editor re-renders
  const [currentContent, setCurrentContent] = useState({ pages: [""] });

  // Memoize the content change handler to prevent the Editor from 
  const handleContentChange = useCallback((newContent) => {
    setCurrentContent(newContent);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initPage = async () => {
      // Don't clear tabs immediately to prevent white-flash flickers
      setSaveStatus("loading");
      try {
        const tabsData = await fileService.getTabs(docId);
        if (isMounted) {
          setTabs(tabsData);
          if (tabsData.length > 0) {
            setActiveTabId(tabsData[0].id);
          }
          setSaveStatus("saved");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading editor data:", err);
          setSaveStatus("error");
        }
      }
    };
    initPage();
    return () => { isMounted = false; };
  }, [docId]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#f8f9fa" }}>
      <Sidebar 
        fileId={docId}
        tabs={tabs} 
        setTabs={setTabs} 
        activeTabId={activeTabId} 
        setActiveTabId={setActiveTabId}
        currentContent={currentContent} 
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        <Editor 
          // ensure internal state in Editor handles activeTabId changes
          key={docId} 
          document={{ id: docId }}
          tabs={tabs}
          activeTabId={activeTabId}
          setSaveStatus={setSaveStatus}
          onContentChange={handleContentChange} 
        />
        
        {/* Status Bar */}
        <div style={{ 
          padding: "6px 20px", 
          fontSize: "12px", 
          color: "#5f6368", 
          borderTop: "1px solid #dadce0",
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ 
            width: "8px", 
            height: "8px", 
            borderRadius: "50%", 
            backgroundColor: saveStatus === "saving" ? "#FBBC04" : saveStatus === "error" ? "#EA4335" : "#34A853"
          }} />
          {saveStatus === "saving" ? "Saving..." : 
           saveStatus === "loading" ? "Loading document..." : 
           saveStatus === "error" ? "Connection error" : "All changes saved"}
        </div>
      </div>
    </div>
  );
}