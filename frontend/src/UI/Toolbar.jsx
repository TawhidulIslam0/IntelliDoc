/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  ChevronRight,
  Check
} from "lucide-react";

const Divider = () => (
  <div style={{ width: "1px", height: "20px", backgroundColor: "#dadce0", margin: "0 8px" }} />
);

// standard font sizes
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

const Toolbar = ({ editorRef, fileId }) => {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(`editor-fontSize-${fileId}`);
    return saved ? Number(saved) : 11;
  });

  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem(`editor-fontFamily-${fileId}`) || "Arial";
  });

  const [currentStyleLabel, setCurrentStyleLabel] = useState(() => {
    return localStorage.getItem(`editor-styleLabel-${fileId}`) || "Normal text";
  });
  
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false); 
  
  const menuRef = useRef(null);
  const fontMenuRef = useRef(null);
  const fontSizeMenuRef = useRef(null); 
  const skipSelectionUpdate = useRef(false);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: "left",
    list: null 
  });
// popular fonts
  const fontOptions = [
    { name: "Arial", family: "Arial, sans-serif" },
    { name: "Times New Roman", family: "Times New Roman, serif" },
    { name: "Calibri", family: "Calibri, sans-serif" },
    { name: "Georgia", family: "Georgia, serif" },
    { name: "Josefina", family: "Josefina, serif" },
    { name: "Lora", family: "Lora, serif" },
    { name: "Open Sans", family: "Open Sans, sans-serif" },
    { name: "Quicksets", family: "Quicksets, sans-serif" },
    { name: "Raleway", family: "Raleway, sans-serif" },
    { name: "Roboto", family: "Roboto, sans-serif" },
  ];
// styles
  const textStyles = [
    { label: "Normal text", value: "p", preview: { fontSize: "14px", fontWeight: "400" } },
    { label: "Title", value: "h1", preview: { fontSize: "24px", fontWeight: "700" } },
    { label: "Subtitle", value: "h2", preview: { fontSize: "18px", fontWeight: "400", color: "#70757a" } },
    { label: "Heading 1", value: "h3", preview: { fontSize: "20px", fontWeight: "700" } },
    { label: "Heading 2", value: "h4", preview: { fontSize: "17px", fontWeight: "700", color: "#3c4043" } },
    { label: "Heading 3", value: "h5", preview: { fontSize: "15px", fontWeight: "700" } },
  ];

  useEffect(() => {
    if (!fileId) return;
    localStorage.setItem(`editor-fontSize-${fileId}`, fontSize);
    localStorage.setItem(`editor-fontFamily-${fileId}`, fontFamily);
    localStorage.setItem(`editor-styleLabel-${fileId}`, currentStyleLabel);
  }, [fontSize, fontFamily, currentStyleLabel, fileId]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (skipSelectionUpdate.current) return;
      
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        align: document.queryCommandState("justifyCenter") ? "center" : "left",
      });

      const rawFont = document.queryCommandValue("fontName");
      if (rawFont) {
        const cleanFont = rawFont.replace(/['"]+/g, '');
        const exists = fontOptions.find(f => f.name.toLowerCase() === cleanFont.toLowerCase());
        if (exists) setFontFamily(exists.name);
      }

      const blockValue = document.queryCommandValue("formatBlock");
      const styleMatch = textStyles.find(s => s.value === blockValue);
      if (styleMatch) setCurrentStyleLabel(styleMatch.label);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        const blockValue = document.queryCommandValue("formatBlock");
        if (["h1", "h2", "h3", "h4", "h5"].includes(blockValue)) {
          setTimeout(() => {
            document.execCommand("formatBlock", false, "p");
            setCurrentStyleLabel("Normal text");
            localStorage.setItem(`editor-styleLabel-${fileId}`, "Normal text");
            document.execCommand("fontName", false, "Arial");
            setFontFamily("Arial");
            localStorage.setItem(`editor-fontFamily-${fileId}`, "Arial");
          }, 10);
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("keydown", handleKeyDown);

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsStyleMenuOpen(false);
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target)) setIsFontMenuOpen(false);
      if (fontSizeMenuRef.current && !fontSizeMenuRef.current.contains(event.target)) setIsFontSizeMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fileId]);

  const applyCommand = (command, value = null) => {
    if (editorRef?.current) editorRef.current.focus();
    let finalValue = value;
    if (command === "fontName" && value && value.includes(" ")) {
      finalValue = `'${value}'`;
    }
    document.execCommand(command, false, finalValue);
  };
    // font size
  const updateFontSize = (newSize) => {
  const size = Math.max(1, Math.min(newSize, 96));
  setFontSize(size);

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  // If no text is selected → apply to future typing
  if (selection.isCollapsed) {
    document.execCommand("fontSize", false, "7");

    const fontElements = document.getElementsByTagName("font");
    for (let el of fontElements) {
      if (el.size === "7") {
        el.removeAttribute("size");
        el.style.fontSize = `${size}px`;
      }
    }
  } else {
    // Wrap selected text in span (THIS fixes your issue)
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.style.lineHeight = "1.2";

    try {
      range.surroundContents(span);
    } catch (e) {
      // fallback if selection is complex
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }

    // keep selection
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);
  }

  if (fileId) {
    localStorage.setItem(`editor-fontSize-${fileId}`, size);
  }
};

  const btnStyle = {
    border: "none", background: "transparent", padding: "6px", borderRadius: "4px",
    cursor: "pointer", color: "#444746", display: "flex", alignItems: "center",
    justifyContent: "center", transition: "background-color 0.2s",
    outline: "none", position: "relative"
  };

  const getBtnStyle = (isActive) => ({
    ...btnStyle,
    backgroundColor: isActive ? "#d3e3fd" : "transparent",
    color: isActive ? "#041e49" : "#444746",
  });

  const handleStyleSelect = (style) => {
    applyCommand("formatBlock", style.value);
    setCurrentStyleLabel(style.label);
    if (fileId) localStorage.setItem(`editor-styleLabel-${fileId}`, style.label);
    setIsStyleMenuOpen(false);
  };

  const handleFontSelect = (font) => {
    skipSelectionUpdate.current = true;
    setFontFamily(font.name);
    if (fileId) localStorage.setItem(`editor-fontFamily-${fileId}`, font.name);
    applyCommand("fontName", font.name);
    setIsFontMenuOpen(false);
    setTimeout(() => { skipSelectionUpdate.current = false; }, 100);
  };

  const handleMouseEnter = (e) => (e.currentTarget.style.backgroundColor = "#e1e5ea");
  const handleMouseLeave = (e, isActive) => (e.currentTarget.style.backgroundColor = isActive ? "#d3e3fd" : "transparent");

  return (
    <div
      className="toolbar"
      style={{
        height: "48px", backgroundColor: "#edf2fa", margin: "4px 12px",
        borderRadius: "24px", display: "flex", alignItems: "center",
        padding: "0 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        position: "relative", zIndex: 50
      }}
    >
      <input
        type="text"
        placeholder="Search features..."
        style={{
          padding: "6px 12px", borderRadius: "20px", border: "1px solid #dadce0",
          marginRight: "8px", minWidth: "180px", fontSize: "13px", outline: "none"
        }}
      />

      <Divider />

      <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); applyCommand("undo")}} title="Undo"><Undo size={18} /></button>
      <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); applyCommand("redo")}} title="Redo"><Redo size={18} /></button>
      <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={() => window.print()} title="Print"><Printer size={18} /></button>

      <Divider />

      <div style={{ position: "relative" }} ref={menuRef} title="Styles">
        <button
          style={{ ...btnStyle, width: "130px", justifyContent: "space-between", padding: "0 8px", fontSize: "14px" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
        >
          {currentStyleLabel}
          <ChevronDown size={14} />
        </button>

        {isStyleMenuOpen && (
          <div style={{ position: "absolute", top: "40px", left: 0, backgroundColor: "white", border: "1px solid #dadce0", borderRadius: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "240px", padding: "4px 0" }}>
            {textStyles.map((s) => (
              <div 
                key={s.label} 
                onMouseDown={(e) => { e.preventDefault(); handleStyleSelect(s); }} 
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} 
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f3f4")} 
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ ...s.preview, fontFamily: "Arial" }}>{s.label}</span>
                <ChevronRight size={14} color="#70757a" />
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <div style={{ position: "relative" }} ref={fontMenuRef} title="Font">
        <button
          style={{ ...btnStyle, width: "150px", justifyContent: "space-between", padding: "0 8px", fontSize: "14px", fontFamily: fontFamily }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fontFamily}</span>
          <ChevronDown size={14} />
        </button>

        {isFontMenuOpen && (
          <div style={{ position: "absolute", top: "40px", left: 0, backgroundColor: "white", border: "1px solid #dadce0", borderRadius: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "220px", maxHeight: "350px", overflowY: "auto", padding: "6px 0" }}>
            {fontOptions.map((font) => (
              <div
                key={font.name}
                onMouseDown={(e) => { e.preventDefault(); handleFontSelect(font); }}
                style={{ 
                  padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontFamily: font.family, fontSize: "15px",
                  backgroundColor: fontFamily === font.name ? "#e8f0fe" : "transparent"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = fontFamily === font.name ? "#d2e3fc" : "#f1f3f4")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = fontFamily === font.name ? "#e8f0fe" : "transparent")}
              >
                {font.name}
                {fontFamily === font.name && <Check size={14} color="#1a73e8" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Improved styling for Font Size input to look like Google Docs */}
      <div style={{ position: "relative" }} ref={fontSizeMenuRef} title="Font Size">
        <div style={{ display: "flex", alignItems: "center" }}>
          <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); updateFontSize(fontSize - 1)}}>-</button>
          <input
            type="number"
            value={fontSize}
            onClick={() => setIsFontSizeMenuOpen(!isFontSizeMenuOpen)}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val) updateFontSize(val);
            }}
            style={{ 
              width: "36px", 
              textAlign: "center", 
              border: "1px solid transparent", 
              background: "transparent", 
              fontSize: "14px", 
              outline: "none", 
              cursor: "pointer",
              borderRadius: "4px",
              margin: "0 2px"
            }}
            onFocus={(e) => e.target.style.border = "1px solid #1a73e8"}
            onBlur={(e) => e.target.style.border = "1px solid transparent"}
          />
          <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); updateFontSize(fontSize + 1)}}>+</button>
        </div>

        {isFontSizeMenuOpen && (
          <div style={{ position: "absolute", top: "40px", left: "50%", transform: "translateX(-50%)", backgroundColor: "white", border: "1px solid #dadce0", borderRadius: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "60px", maxHeight: "300px", overflowY: "auto", padding: "4px 0" }}>
            {FONT_SIZES.map((size) => (
              <div
                key={size}
                onMouseDown={(e) => { e.preventDefault(); updateFontSize(size); setIsFontSizeMenuOpen(false); }}
                style={{ padding: "8px 12px", cursor: "pointer", textAlign: "center", fontSize: "14px", backgroundColor: fontSize === size ? "#e8f0fe" : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f3f4")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = fontSize === size ? "#e8f0fe" : "transparent")}
              >
                {size}
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <button style={getBtnStyle(activeFormats.bold)} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.bold)} onMouseDown={(e) => {e.preventDefault(); applyCommand("bold")}} title="Bold"><Bold size={18} /></button>
      <button style={getBtnStyle(activeFormats.italic)} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.italic)} onMouseDown={(e) => {e.preventDefault(); applyCommand("italic")}} title="Italic"><Italic size={18} /></button>
      <button style={getBtnStyle(activeFormats.underline)} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.underline)} onMouseDown={(e) => {e.preventDefault(); applyCommand("underline")}} title="Underline"><Underline size={18} /></button>

      <Divider />

      <button style={getBtnStyle(activeFormats.align === "left")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.align === "left")} onMouseDown={(e) => {e.preventDefault(); applyCommand("justifyLeft")}} title="Align Left"><AlignLeft size={18} /></button>
      <button style={getBtnStyle(activeFormats.align === "center")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.align === "center")} onMouseDown={(e) => {e.preventDefault(); applyCommand("justifyCenter")}} title="Align Center"><AlignCenter size={18} /></button>
      
      <Divider />

      <button style={btnStyle} title="Insert Image" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => { e.preventDefault(); const url = prompt("Enter Image URL:"); if (url) applyCommand("insertImage", url); }}><Image size={18} /></button>
      <button style={btnStyle} title="Insert Link" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => { e.preventDefault(); const url = prompt("Enter Link URL:"); if (url) applyCommand("createLink", url); }}><Link size={18} /></button>
      <input type="color" title="Text Color" onChange={(e) => applyCommand("foreColor", e.target.value)} style={{ width: "24px", height: "24px", border: "none", cursor: "pointer", marginLeft: "8px" }} />
    </div>
  );
};

export default Toolbar;