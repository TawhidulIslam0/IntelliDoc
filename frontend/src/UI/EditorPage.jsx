/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Editor from "./Editor";
import * as fileService from "../api/fileService";

export default function EditorPage() {
  const { docId } = useParams(); 
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  
  // This state tracks the "live" unsaved content from the Editor
  const [currentContent, setCurrentContent] = useState({ pages: [""] });

  useEffect(() => {
    let isMounted = true;
    const initPage = async () => {
      setTabs([]);
      setActiveTabId(null);
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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar 
        fileId={docId}
        tabs={tabs} 
        setTabs={setTabs} 
        activeTabId={activeTabId} 
        setActiveTabId={setActiveTabId}
        //  Pass the live content to the sidebar
        currentContent={currentContent} 
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Editor 
          key={docId} 
          document={{ id: docId }}
          tabs={tabs}
          activeTabId={activeTabId}
          setSaveStatus={setSaveStatus}
          // Update the parent whenever the user types
          onContentChange={setCurrentContent} 
        />
        
        <div style={{ padding: "4px 20px", fontSize: "12px", color: "#666", borderTop: "1px solid #ddd" }}>
          {saveStatus === "saving" ? "Saving..." : 
           saveStatus === "loading" ? "Loading document..." : "All changes saved"}
        </div>
      </div>
    </div>
  );
}