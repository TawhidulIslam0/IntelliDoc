import React, { useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Undo,
  Redo,
  Printer,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Image,
  Link,
  Tag,
  MessageCircle
} from "lucide-react";

// Divider between toolbar groups
const Divider = () => (
  <div style={{ width: "1px", height: "20px", backgroundColor: "#dadce0", margin: "0 8px" }} />
);

const Toolbar = ({ editorRef }) => {
  const [fontSize, setFontSize] = useState(11);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [zoom, setZoom] = useState(1); // Zoom level

  // Basic execCommand wrapper
  const applyCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  // Apply custom style to selected text
  const applyStyleToSelection = (styleProp, value) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style[styleProp] = value;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);
  };

  const updateFontSize = (newSize) => {
    const size = Math.max(1, Math.min(newSize, 96));
    setFontSize(size);
    applyStyleToSelection("fontSize", `${size}px`);
  };

  // Update zoom for editor
  const updateZoom = (value) => {
    setZoom(value);
    if (editorRef && editorRef.current) {
      editorRef.current.style.transform = `scale(${value})`;
      editorRef.current.style.transformOrigin = "top left";
    }
  };

  const btnStyle = {
    border: "none",
    background: "transparent",
    padding: "4px 6px",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#444746",
    display: "flex",
    alignItems: "center",
  };

  const selectStyle = { ...btnStyle, fontSize: "14px", backgroundColor: "transparent", outline: "none" };

  return (
    <div
      style={{
        height: "48px",
        backgroundColor: "#edf2fa",
        margin: "4px 12px",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        overflowX: "auto",
      }}
    >
      {/* 1. Search Bar */}
      <input
        type="text"
        placeholder="Search features..."
        style={{
          padding: "4px 12px",
          borderRadius: "24px",
          border: "1px solid #dadce0",
          marginRight: "8px",
          minWidth: "200px",
        }}
      />

      <Divider />

      {/* 2. History */}
      <button style={btnStyle} onClick={() => applyCommand("undo")} title="Undo"><Undo size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("redo")} title="Redo"><Redo size={18} /></button>
      <button style={btnStyle} onClick={() => window.print()} title="Print"><Printer size={18} /></button>

      <Divider />

      {/* 3. Text Styles: Normal, Title, Subtitle, Headings */}
      <select style={selectStyle} onChange={(e) => applyCommand("formatBlock", e.target.value)}>
        <option value="p">Normal text</option>
        <option value="h1">Title</option>
        <option value="h2">Subtitle</option>
        <option value="h3">Heading 1</option>
        <option value="h4">Heading 2</option>
        <option value="h5">Heading 3</option>
      </select>

      {/* 4. Font Family */}
      <select
        style={{ ...selectStyle, width: "120px" }}
        value={fontFamily}
        onChange={(e) => { setFontFamily(e.target.value); applyCommand("fontName", e.target.value); }}
      >
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="Georgia">Georgia</option>
        <option value="Verdana">Verdana</option>
        <option value="Roboto">Roboto</option>
      </select>

      <Divider />

      {/* 5. Font Size */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button style={btnStyle} onClick={() => updateFontSize(fontSize - 1)}>-</button>
        <input
          type="number"
          value={fontSize}
          onChange={(e) => updateFontSize(parseInt(e.target.value) || 11)}
          style={{ width: "35px", textAlign: "center", border: "1px solid #dadce0", borderRadius: "4px", margin: "0 4px", fontSize: "14px" }}
        />
        <button style={btnStyle} onClick={() => updateFontSize(fontSize + 1)}>+</button>
      </div>

      <Divider />

      {/* 6. Zoom */}
      <select style={selectStyle} value={zoom} onChange={(e) => updateZoom(parseFloat(e.target.value))}>
        <option value={0.75}>75%</option>
        <option value={0.9}>90%</option>
        <option value={1}>100%</option>
        <option value={1.25}>125%</option>
        <option value={1.5}>150%</option>
      </select>

      <Divider />

      {/* 7. Basic formatting */}
      <button style={btnStyle} onClick={() => applyCommand("bold")} title="Bold"><Bold size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("italic")} title="Italic"><Italic size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("underline")} title="Underline"><Underline size={18} /></button>

      <Divider />

      {/* 8. Alignment & Lists */}
      <button style={btnStyle} onClick={() => applyCommand("justifyLeft")} title="Align Left"><AlignLeft size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("justifyCenter")} title="Align Center"><AlignCenter size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("insertUnorderedList")} title="Bulleted List"><List size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("insertOrderedList")} title="Numbered List"><ListOrdered size={18} /></button>

      <Divider />

      {/* 9. Images / Links / Text Color */}
      <button style={btnStyle} onClick={() => { const url = prompt("Enter Image URL:"); if (url) applyCommand("insertImage", url); }} title="Insert Image"><Image size={18} /></button>
      <button style={btnStyle} onClick={() => { const url = prompt("Enter Link URL:"); if (url) applyCommand("createLink", url); }} title="Insert Link"><Link size={18} /></button>
      <input type="color" onChange={(e) => applyCommand("foreColor", e.target.value)} style={{ marginLeft: "4px" }} title="Text Color" />

      <Divider />

      {/* 10. Comments / Tags */}
      <button style={btnStyle} title="Profile Tag"><Tag size={18} /></button>
      <button style={btnStyle} title="Comments/Notes"><MessageCircle size={18} /></button>
    </div>
  );
};

export default Toolbar;