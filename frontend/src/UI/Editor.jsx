/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from "react";

const PAGE_HEIGHT = 1056;
const PAGE_WIDTH = 816;
const GAP_SIZE = 24;
const PADDING = 96;

export default function Editor({ document: doc, setSaveStatus }) {
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const lastLoadedId = useRef(null);
  const docId = doc?.id || doc?.file_id;

  // Auto Save 
  const triggerAutoSave = () => {
    setSaveStatus("saving");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!docId) return;

        const token = localStorage.getItem("token");
        const allPages = containerRef.current.querySelectorAll("[contentEditable]");

        //  map to innerHTML to save all font/style tags
        const pages = Array.from(allPages).map((p) => p.innerHTML ?? "");

        const res = await fetch(
          `http://localhost:8000/api/files/${docId}/content`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: { pages: pages },
            }),
          }
        );

        if (!res.ok) throw new Error("Server failed to save");

        setSaveStatus("saved");
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("error");
      }
    }, 1500);
  };

  const createPage = (initialContent = "", index) => {
    if (!containerRef.current) return;

    const page = document.createElement("div");
    page.className = "editor-page";
    page.style.width = `${PAGE_WIDTH}px`;
    page.style.height = `${PAGE_HEIGHT}px`;
    page.style.backgroundColor = "white";
    page.style.boxShadow = "0 1px 3px rgba(60,64,67,0.15)";
    page.style.border = "1px solid #dadce0";
    page.style.position = "relative";
    page.style.marginBottom = `${GAP_SIZE}px`;

    const pageNumber = document.createElement("div");
    pageNumber.style.position = "absolute";
    pageNumber.style.bottom = "30px";
    pageNumber.style.left = "50%";
    pageNumber.style.transform = "translateX(-50%)";
    pageNumber.style.color = "#70757a";
    pageNumber.style.fontSize = "11px";
    pageNumber.innerText =
      index !== undefined
        ? index + 1
        : containerRef.current.children.length + 1;

    page.appendChild(pageNumber);

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    editable.style.width = "100%";
    editable.style.height = "100%";
    editable.style.padding = `${PADDING}px`;
    editable.style.outline = "none";
    
    //  Standardized to match toolbar defaults and scale correctly
    editable.style.fontSize = "11pt"; 
    editable.style.fontFamily = "Arial, sans-serif";
    editable.style.lineHeight = "normal"; // Allows line height to grow with large fonts
    
    editable.style.color = "#202124";
    editable.style.boxSizing = "border-box";
    editable.style.overflow = "hidden";
    editable.style.wordBreak = "break-word";
    
    // Smooth text rendering
    editable.style.webkitFontSmoothing = "antialiased";

    // Inject as innerHTML to render saved styles
    editable.innerHTML = initialContent || "<div><br></div>";

    editable.addEventListener("input", () => {
      handleInput(editable);
      triggerAutoSave();
    });

    editable.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        handleMergeBackspace(editable, e);
        triggerAutoSave();
      }
    });

    page.appendChild(editable);
    containerRef.current.appendChild(page);
    return editable;
  };

  const handleInput = (el) => {
    // Basic overflow handling using innerHTML
    if (el.scrollHeight > PAGE_HEIGHT) {
      const parentPage = el.parentElement;
      let nextPage = parentPage.nextSibling;
      let nextEditable;

      if (!nextPage) {
        nextEditable = createPage();
      } else {
        nextEditable = nextPage.querySelector("[contentEditable]");
      }

      // Simple HTML shift: move last child to next page
      if (el.lastChild) {
        nextEditable.prepend(el.lastChild);
        placeCursorAtStart(nextEditable);
      }
    }
  };

  const handleMergeBackspace = (el, e) => {
    if (!isCursorAtStart(el)) return;

    const parentPage = el.parentElement;
    const prevPage = parentPage.previousSibling;
    if (!prevPage) return;

    const prevEditable = prevPage.querySelector("[contentEditable]");
    
    // Merge innerHTML instead of innerText
    const currentHTML = el.innerHTML;
    if (currentHTML !== "<div><br></div>" && currentHTML !== "<br>") {
      prevEditable.innerHTML += currentHTML;
    }

    parentPage.remove();
    placeCursorAtEnd(prevEditable);
    e.preventDefault();
  };

  const isCursorAtStart = (el) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    if (!el.contains(range.startContainer)) return false;

    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    testRange.setEnd(range.startContainer, range.startOffset);

    return testRange.toString().replace(/\n/g, "").length === 0;
  };

  const placeCursorAtStart = (el) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(el, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
  };

  const placeCursorAtEnd = (el) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
  };

  useEffect(() => {
    const loadContent = async () => {
      if (!docId || lastLoadedId.current === docId) return;

      try {
        setSaveStatus("saving");
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:8000/api/files/${docId}/content`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const serverPages = data.content?.pages || [""];

          if (containerRef.current) {
            containerRef.current.innerHTML = "";
            serverPages.forEach((content, idx) =>
              createPage(content, idx)
            );
          }

          lastLoadedId.current = docId;
          setSaveStatus("saved");
        } else {
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
            createPage("");
          }
          lastLoadedId.current = docId; 
          setSaveStatus("saved");
        }
      } catch (err) {
        console.error("Load failed:", err);
        setSaveStatus("error");
      }
    };

    loadContent();

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [docId]);

  return (
    <main
      style={{
        flex: 1,
        backgroundColor: "#F1F3F4",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 0",
        overflowY: "auto",
      }}
    >
      <div ref={containerRef} />
    </main>
  );
}