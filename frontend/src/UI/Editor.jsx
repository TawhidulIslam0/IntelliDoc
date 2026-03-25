/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from "react";

const PAGE_HEIGHT = 1056;
const PAGE_WIDTH = 816;
const GAP_SIZE = 24;
const PADDING = 96;

export default function Editor() {
  const containerRef = useRef(null);

  // Create a new blank page
  const createPage = () => {
    const page = document.createElement("div");
    page.style.width = `${PAGE_WIDTH}px`;
    page.style.height = `${PAGE_HEIGHT}px`;
    page.style.backgroundColor = "white";
    page.style.boxShadow = "0 1px 3px rgba(60,64,67,0.15)";
    page.style.border = "1px solid #dadce0";
    page.style.position = "relative";
    page.style.marginBottom = `${GAP_SIZE}px`;

    // Page number
    const pageNumber = document.createElement("div");
    pageNumber.style.position = "absolute";
    pageNumber.style.bottom = "30px";
    pageNumber.style.left = "50%";
    pageNumber.style.transform = "translateX(-50%)";
    pageNumber.style.backgroundColor = "#1f1f1f";
    pageNumber.style.color = "white";
    pageNumber.style.padding = "2px 10px";
    pageNumber.style.borderRadius = "4px";
    pageNumber.style.fontSize = "11px";
    pageNumber.innerText = containerRef.current
      ? containerRef.current.children.length + 1
      : 1;
    page.appendChild(pageNumber);

    // Editable div
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    editable.style.width = "100%";
    editable.style.height = "100%";
    editable.style.padding = `${PADDING}px`;
    editable.style.outline = "none";
    editable.style.fontSize = "15px";
    editable.style.lineHeight = "1.5";
    editable.style.fontFamily = "Arial, sans-serif";
    editable.style.color = "#202124";
    editable.style.boxSizing = "border-box";
    editable.style.overflow = "hidden";
    editable.style.whiteSpace = "pre-wrap";
    editable.style.wordBreak = "break-word";

    editable.addEventListener("input", () => handleInput(editable));

    //  This is the key addition
    editable.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        handleMergeBackspace(editable, e);
      }
    });

    page.appendChild(editable);
    containerRef.current.appendChild(page);

    return editable;
  };

  const handleInput = (el) => {
    // Move lines to next page if overflowing
    while (el.scrollHeight > PAGE_HEIGHT) {
      const lines = el.innerText.split("\n"); 
      if (lines.length === 0) break;

      const overflowLine = lines.pop();
      el.innerText = lines.join("\n");

      // Get or create next page
      const parentPage = el.parentElement;
      let nextPage = parentPage.nextSibling;
      let nextEditable;
      if (!nextPage) {
        nextEditable = createPage();
      } else {
        nextEditable = nextPage.querySelector("[contentEditable]");
      }

      // Prepend overflow line to next page
      nextEditable.innerText = overflowLine + "\n" + nextEditable.innerText;

      // Move caret automatically to the new page
      placeCursorAtStart(nextEditable);
    }
  };

  // Check if cursor is at start 
  const isCursorAtStart = (el) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);

    // Ensure cursor is inside this page
    if (!el.contains(range.startContainer)) return false;

    // Create range from start to cursor
    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    testRange.setEnd(range.startContainer, range.startOffset);

    // Check if anything exists before cursor
    return testRange.toString().replace(/\n/g, "").length === 0;
  };

  //  Merge page with previous one if backspace at start
  const handleMergeBackspace = (el, e) => {
    if (!isCursorAtStart(el)) return;

    const parentPage = el.parentElement;
    const prevPage = parentPage.previousSibling;
    if (!prevPage) return;

    const prevEditable = prevPage.querySelector("[contentEditable]");

    const currentText = el.innerText;

    if (currentText.trim() !== "") {
      prevEditable.innerText +=
        (prevEditable.innerText ? "\n" : "") + currentText;
    }

    parentPage.remove();

    placeCursorAtEnd(prevEditable);

    e.preventDefault();
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
    if (containerRef.current.children.length === 0) {
      createPage();
    }
  }, []);

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