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

  const placeCursorAtStart = (el) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(el, 0);
    range.collapse(true);
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