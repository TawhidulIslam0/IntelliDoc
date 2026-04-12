/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { renameFile } from "../api/fileService"; 

const PAGE_HEIGHT = 1056; 
const PAGE_WIDTH = 816;
const GAP_SIZE = 24;
const PADDING = 96; 

// Added onContentChange to the destructured props
const Editor = forwardRef(({ document: doc, setSaveStatus, onDocUpdate, activeTabId, tabs, onContentChange }, ref) => {
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastLoadedTabId = useRef(null); 
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

  const triggerAutoSave = () => {
    setSaveStatus("saving");
    
    // Get current state of all pages
    const allPages = containerRef.current.querySelectorAll("[contentEditable]");
    const pages = Array.from(allPages).map((p) => p.innerHTML ?? "");
    const contentObj = { pages: pages };

    // Update parent state immediately so Sidebar has latest content for duplication
    if (onContentChange) {
      onContentChange(contentObj);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!activeTabId && !docId) return;
        const token = localStorage.getItem("token");
        
        const url = activeTabId 
          ? `http://localhost:8000/api/files/tabs/${activeTabId}`
          : `http://localhost:8000/api/files/${docId}/content`;
        const method = activeTabId ? "PATCH" : "PUT";
        const body = JSON.stringify({ content: contentObj });
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body,
        });
        setSaveStatus("saved");
      } catch (err) { setSaveStatus("error"); }
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
    editable.addEventListener("mouseup", () => { document.dispatchEvent(new Event("selectionchange")); });
    editable.addEventListener("paste", (e) => { e.preventDefault(); const text = e.clipboardData.getData("text/plain"); document.execCommand("insertText", false, text); handleLayout(editable); });
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
      while (el.scrollHeight > PAGE_HEIGHT && el.lastChild) { nextEditable.prepend(el.lastChild); }
      updatePageNumbers();
    }
    const nextPage = el.parentElement.nextSibling;
    if (nextPage) {
      const nextEditable = nextPage.querySelector("[contentEditable]");
      while (el.scrollHeight < PAGE_HEIGHT - 30 && nextEditable.firstChild) {
        el.appendChild(nextEditable.firstChild);
        if (nextEditable.innerHTML === "" || nextEditable.innerHTML === "<div><br></div>") { nextPage.remove(); updatePageNumbers(); break; }
      }
    }
  };

  const handleBackspace = (el, e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const cleanText = el.textContent.trim();
    if (range.startOffset === 0 && (cleanText === "" || el.innerHTML === "<div><br></div>")) {
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

  useEffect(() => {
    let isMounted = true;

    const loadTabContent = async () => {
      setIsVisible(false); 
      if (containerRef.current) containerRef.current.innerHTML = "";

      if (!activeTabId) {
        setSaveStatus("loading");
        return;
      }

      try {
        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab && isMounted) {
          let contentData = currentTab.content;
          if (typeof contentData === "string" && contentData !== "") {
            try { contentData = JSON.parse(contentData); } 
            catch (e) { contentData = { pages: [""] }; }
          }

          const serverPages = contentData?.pages || [""];
          
          if (containerRef.current && isMounted) {
           
            containerRef.current.innerHTML = "";
            serverPages.forEach((content, idx) => createPage(content, idx));
            
            lastLoadedTabId.current = activeTabId;
            setSaveStatus("saved");
            setIsVisible(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Tab load error:", err);
          setSaveStatus("error");
        }
      }
    };
    
    loadTabContent();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeTabId, docId, tabs]);

  return (
    <main style={{ 
      flex: 1, 
      backgroundColor: "#F1F3F4", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      padding: "40px 0", 
      overflowY: "auto",
      opacity: isVisible ? 1 : 0,
      transition: "opacity 0.1s ease-in-out" 
    }}>
      <div ref={containerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center" }} />
    </main>
  );
});

export default Editor;