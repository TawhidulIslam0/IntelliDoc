/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { renameFile } from "../api/fileService"; 

const PAGE_HEIGHT = 1056; 
const PAGE_WIDTH = 816;
const GAP_SIZE = 24;
const PADDING = 96; 

const Editor = forwardRef(({ document: doc, setSaveStatus, onDocUpdate, activeTabId, tabs, onContentChange }, ref) => {
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const docId = doc?.id || doc?.file_id;

  const [isVisible, setIsVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    handleRename: async (newName) => {
      if (!docId) return;
      setSaveStatus("saving");
      try {
        const updated = await renameFile(docId, newName);
        if (onDocUpdate) onDocUpdate(updated);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      }
    },
    applyFormatting: (command, value = null) => {
      document.execCommand(command, false, value);
      triggerAutoSave();
    }
  }));

  // Helper to get current text/HTML from the DOM
  const getLiveContent = () => {
    if (!containerRef.current) return { pages: [""] };
    const allPages = containerRef.current.querySelectorAll("[contentEditable]");
    const pages = Array.from(allPages).map((p) => p.innerHTML ?? "");
    return { pages };
  };

  const triggerAutoSave = () => {
    setSaveStatus("saving");
    const contentObj = getLiveContent();

    //  Tell the parent (App.jsx) exactly what is on screen right now
    if (onContentChange) {
      onContentChange(contentObj);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!activeTabId) return;
        const token = localStorage.getItem("token");
        
        const url = `http://localhost:8000/api/files/tabs/${activeTabId}`;
        const body = JSON.stringify({ content: contentObj });

        const res = await fetch(url, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body,
        });

        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
      } catch (err) { 
        console.error("Autosave error:", err);
        setSaveStatus("error"); 
      }
    }, 1500);
  };

  const createPage = (initialContent = "", index) => {
    if (!containerRef.current) return;
    const page = document.createElement("div");
    page.className = "editor-page";
    page.style.cssText = `width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; min-height: ${PAGE_HEIGHT}px; max-height: ${PAGE_HEIGHT}px; background-color: white; box-shadow: 0 1px 3px rgba(60,64,67,0.15); border: 1px solid #dadce0; position: relative; margin-bottom: ${GAP_SIZE}px; flex-shrink: 0; overflow: hidden;`;
    
    const pageNumber = document.createElement("div");
    pageNumber.className = "page-number-label";
    pageNumber.style.cssText = `position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: #70757a; font-size: 11px; pointer-events: none; user-select: none;`;
    pageNumber.innerText = index !== undefined ? index + 1 : containerRef.current.children.length + 1;
    page.appendChild(pageNumber);

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    editable.style.cssText = `width: 100%; height: 100%; padding: ${PADDING}px; outline: none; font-size: 11pt; font-family: "Arial", sans-serif; overflow: hidden; box-sizing: border-box; line-height: 1.2; color: #202124; word-break: break-word; white-space: pre-wrap; cursor: text;`;
    editable.innerHTML = initialContent || "<div><br></div>";

    editable.addEventListener("input", () => { handleLayout(editable); triggerAutoSave(); });
    editable.addEventListener("paste", (e) => { 
      e.preventDefault(); 
      const text = e.clipboardData.getData("text/plain"); 
      document.execCommand("insertText", false, text); 
      handleLayout(editable); 
    });
    editable.addEventListener("keydown", (e) => { if (e.key === "Backspace") handleBackspace(editable, e); });

    page.appendChild(editable);
    containerRef.current.appendChild(page);
    return editable;
  };

  const handleLayout = (el) => {
    if (el.scrollHeight > PAGE_HEIGHT) {
      const parentPage = el.parentElement;
      let nextPage = parentPage.nextSibling;
      let nextEditable = !nextPage ? createPage() : nextPage.querySelector("[contentEditable]");
      while (el.scrollHeight > PAGE_HEIGHT && el.lastChild) { 
        nextEditable.prepend(el.lastChild); 
      }
      updatePageNumbers();
    }
  };

  const handleBackspace = (el, e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (range.startOffset === 0 && (el.textContent.trim() === "" || el.innerHTML === "<div><br></div>")) {
      const parentPage = el.parentElement;
      const prevPage = parentPage.previousSibling;
      if (!prevPage) return; 
      const prevEditable = prevPage.querySelector("[contentEditable]");
      e.preventDefault();
      parentPage.remove();
      updatePageNumbers();
      const newRange = document.createRange();
      newRange.selectNodeContents(prevEditable);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      prevEditable.focus();
      triggerAutoSave();
    }
  };

  const updatePageNumbers = () => {
    const labels = containerRef.current?.querySelectorAll(".page-number-label") || [];
    labels.forEach((label, i) => { label.innerText = i + 1; });
  };

  //  Content Loading & Syncing
  useEffect(() => {
    let isMounted = true;

    const loadTabContent = () => {
      if (!containerRef.current) return;
      
      //  Reset visual state
      setIsVisible(false); 
      containerRef.current.innerHTML = "";

      if (!activeTabId || !tabs) {
        setSaveStatus("loading");
        return;
      }

      // Find content in the tabs array provided by parent
      const currentTab = tabs.find(t => String(t.id) === String(activeTabId));
      
      if (currentTab && isMounted) {
        let contentData = currentTab.content;
        
        // Handle parsing
        if (typeof contentData === "string" && contentData !== "") {
          try { contentData = JSON.parse(contentData); } 
          catch (e) { contentData = { pages: [""] }; }
        }

        const serverPages = contentData?.pages || [""];
        
        // Render pages to DOM
        serverPages.forEach((content, idx) => createPage(content, idx));
        
        setSaveStatus("saved");
        setIsVisible(true);

        // Update the bridge so Sidebar/App has the initial tab content loaded
        if (onContentChange) {
            onContentChange(contentData || { pages: [""] });
        }
      }
    };
    
    loadTabContent();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeTabId, tabs]); 

  return (
    <main style={{ 
      flex: 1, backgroundColor: "#F1F3F4", display: "flex", flexDirection: "column", 
      alignItems: "center", padding: "40px 0", overflowY: "auto",
      opacity: isVisible ? 1 : 0, transition: "opacity 0.1s ease-in-out" 
    }}>
      <div ref={containerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center" }} />
    </main>
  );
});

export default Editor;