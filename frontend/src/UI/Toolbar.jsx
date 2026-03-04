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
  const [zoom, setZoom] = useState(1);

  // Track active formatting for visual selection
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: "left", // left, center
    list: null // "ul" or "ol"
  });

  // Basic execCommand wrapper with state update
  const applyCommand = (command, value = null) => {
    document.execCommand(command, false, value);

    switch (command) {
      case "bold":
        setActiveFormats(prev => ({ ...prev, bold: !prev.bold }));
        break;
      case "italic":
        setActiveFormats(prev => ({ ...prev, italic: !prev.italic }));
        break;
      case "underline":
        setActiveFormats(prev => ({ ...prev, underline: !prev.underline }));
        break;
      case "justifyLeft":
        setActiveFormats(prev => ({ ...prev, align: "left" }));
        break;
      case "justifyCenter":
        setActiveFormats(prev => ({ ...prev, align: "center" }));
        break;
      case "insertUnorderedList":
        setActiveFormats(prev => ({ ...prev, list: prev.list === "ul" ? null : "ul" }));
        break;
      case "insertOrderedList":
        setActiveFormats(prev => ({ ...prev, list: prev.list === "ol" ? null : "ol" }));
        break;
      default:
        break;
    }
  };

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
    transition: "all 0.2s ease",
  };

  // Dynamic style based on active state
  const getBtnStyle = (isActive) => ({
    ...btnStyle,
    backgroundColor: isActive ? "#E0E7FF" : "transparent",
    color: isActive ? "#1E40AF" : "#444746",
  });

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
      {/* Search Bar */}
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

      {/* History */}
      <button style={btnStyle} onClick={() => applyCommand("undo")} title="Undo"><Undo size={18} /></button>
      <button style={btnStyle} onClick={() => applyCommand("redo")} title="Redo"><Redo size={18} /></button>
      <button style={btnStyle} onClick={() => window.print()} title="Print"><Printer size={18} /></button>

      <Divider />

      {/* Text Styles */}
      <select style={selectStyle} onChange={(e) => applyCommand("formatBlock", e.target.value)}>
        <option value="p">Normal text</option>
        <option value="h1">Title</option>
        <option value="h2">Subtitle</option>
        <option value="h3">Heading 1</option>
        <option value="h4">Heading 2</option>
        <option value="h5">Heading 3</option>
      </select>

      {/* Font Family */}
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

      {/* Font Size */}
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

      {/* Zoom */}
      <select style={selectStyle} value={zoom} onChange={(e) => updateZoom(parseFloat(e.target.value))}>
        <option value={0.75}>75%</option>
        <option value={0.9}>90%</option>
        <option value={1}>100%</option>
        <option value={1.25}>125%</option>
        <option value={1.5}>150%</option>
      </select>

      <Divider />

      {/* Formatting Buttons */}
      <button style={getBtnStyle(activeFormats.bold)} onClick={() => applyCommand("bold")} title="Bold"><Bold size={18} /></button>
      <button style={getBtnStyle(activeFormats.italic)} onClick={() => applyCommand("italic")} title="Italic"><Italic size={18} /></button>
      <button style={getBtnStyle(activeFormats.underline)} onClick={() => applyCommand("underline")} title="Underline"><Underline size={18} /></button>

      <Divider />

      {/* Alignment & Lists */}
      <button style={getBtnStyle(activeFormats.align === "left")} onClick={() => applyCommand("justifyLeft")} title="Align Left"><AlignLeft size={18} /></button>
      <button style={getBtnStyle(activeFormats.align === "center")} onClick={() => applyCommand("justifyCenter")} title="Align Center"><AlignCenter size={18} /></button>
      <button style={getBtnStyle(activeFormats.list === "ul")} onClick={() => applyCommand("insertUnorderedList")} title="Bulleted List"><List size={18} /></button>
      <button style={getBtnStyle(activeFormats.list === "ol")} onClick={() => applyCommand("insertOrderedList")} title="Numbered List"><ListOrdered size={18} /></button>

      <Divider />

      {/* Images / Links / Text Color */}
      <button style={btnStyle} onClick={() => { const url = prompt("Enter Image URL:"); if (url) applyCommand("insertImage", url); }} title="Insert Image"><Image size={18} /></button>
      <button style={btnStyle} onClick={() => { const url = prompt("Enter Link URL:"); if (url) applyCommand("createLink", url); }} title="Insert Link"><Link size={18} /></button>
      <input type="color" onChange={(e) => applyCommand("foreColor", e.target.value)} style={{ marginLeft: "4px" }} title="Text Color" />

    </div>
  );
};

export default Toolbar;