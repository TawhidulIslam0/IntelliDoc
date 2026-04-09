/* eslint-disable react-hooks/static-components */
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
  AlignRight,
  List,
  ListOrdered,
  Image,
  Link,
  ChevronDown,
  ChevronRight,
  Check,
  Baseline,
  Highlighter,
  Type,
} from "lucide-react";

// CSS to hide the up/down arrows (spinners) in the font size input
const hideArrowsCSS = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

const Divider = () => (
  <div style={{ width: "1px", height: "20px", backgroundColor: "#dadce0", margin: "0 8px" }} />
);

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

const COLOR_PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
];

const Toolbar = ({ editorRef, fileId }) => {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(`editor-fontSize-${fileId}`);
    return saved ? Number(saved) : 11;
  });

  // Local state for the input field to prevent jumping while typing
  const [inputValue, setInputValue] = useState(fontSize.toString());

  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem(`editor-fontFamily-${fileId}`) || "Arial";
  });

  const [currentStyleLabel, setCurrentStyleLabel] = useState(() => {
    return localStorage.getItem(`editor-styleLabel-${fileId}`) || "Normal text";
  });

  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false);
  const [isTextColorOpen, setIsTextColorOpen] = useState(false);
  const [isHighlightColorOpen, setIsHighlightColorOpen] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("transparent");

  const menuRef = useRef(null);
  const fontMenuRef = useRef(null);
  const fontSizeMenuRef = useRef(null);
  const textColorRef = useRef(null);
  const highlightColorRef = useRef(null);
  const skipSelectionUpdate = useRef(false);
  const isTypingFontSize = useRef(false); 
  const isApplyingSize = useRef(false); // NEW: Lock to prevent cursor detection from reverting size

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: "left",
    list: null
  });

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
      // IF applying size or typing, don't let the cursor position change the toolbar number
      if (skipSelectionUpdate.current || isTypingFontSize.current || isApplyingSize.current) return;
      
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        align: document.queryCommandState("justifyCenter") ? "center" : 
               document.queryCommandState("justifyRight") ? "right" : "left",
        list: document.queryCommandState("insertUnorderedList") ? "bullet" :
              document.queryCommandState("insertOrderedList") ? "number" : null
      });

      // SYNC FONT SIZE WITH CURSOR POSITION
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;

        if (node) {
          const computedStyle = window.getComputedStyle(node);
          const sizeInPx = parseFloat(computedStyle.fontSize);
          const sizeInPt = Math.round(sizeInPx * 0.75);
          setFontSize(sizeInPt);
          setInputValue(sizeInPt.toString()); 
        }
      }

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
      if (textColorRef.current && !textColorRef.current.contains(event.target)) setIsTextColorOpen(false);
      if (highlightColorRef.current && !highlightColorRef.current.contains(event.target)) setIsHighlightColorOpen(false);
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

  const updateFontSize = (newSize) => {
    const size = Math.max(1, Math.min(newSize, 96));
    
    // LOCK selection updates so the editor doesn't fight back
    isApplyingSize.current = true;
    
    setFontSize(size);
    setInputValue(size.toString());
    
    if (editorRef?.current) editorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    if (selection.isCollapsed) {
      const span = document.createElement("span");
      span.style.fontSize = `${size}pt`;
      span.style.lineHeight = "1.2";
      span.innerHTML = "&#8203;"; 

      range.insertNode(span);
      
      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.setEnd(span.firstChild, 1);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      const span = document.createElement("span");
      span.style.fontSize = `${size}pt`;
      span.style.lineHeight = "1.2";
      try {
        range.surroundContents(span);
      } catch (e) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    }
    
    if (fileId) localStorage.setItem(`editor-fontSize-${fileId}`, size);

    // UNLOCK after a delay to allow the user to click and type
    setTimeout(() => {
      isApplyingSize.current = false;
    }, 500);
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

  const ColorPicker = ({ onSelect, activeColor }) => (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(10, 1fr)", 
      gap: "4px", 
      padding: "8px", 
      backgroundColor: "white", 
      border: "1px solid #dadce0", 
      borderRadius: "8px", 
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      width: "220px"
    }}>
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          onMouseDown={(e) => { e.preventDefault(); onSelect(color); }}
          style={{
            width: "18px", height: "18px", backgroundColor: color, border: color === "#ffffff" ? "1px solid #dadce0" : "none",
            borderRadius: "2px", cursor: "pointer", position: "relative"
          }}
        >
          {activeColor === color && <div style={{ position: "absolute", top: "-2px", left: "-2px", right: "-2px", bottom: "-2px", border: "2px solid #1a73e8", borderRadius: "2px" }} />}
        </button>
      ))}
    </div>
  );

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
      <style>{hideArrowsCSS}</style>

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

      <div style={{ position: "relative" }} ref={fontSizeMenuRef}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); updateFontSize(fontSize - 1)}} title="Decrease font size">-</button>
          <input
            type="number"
            value={inputValue}
            title="Font size"
            onClick={() => setIsFontSizeMenuOpen(!isFontSizeMenuOpen)}
            onChange={(e) => {
              isTypingFontSize.current = true; 
              setInputValue(e.target.value);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    const val = parseInt(e.target.value);
                    if (val) updateFontSize(val);
                    e.target.blur();
                }
            }}
            style={{ 
              width: "36px", 
              textAlign: "center", 
              border: "1px solid transparent", 
              background: "transparent", 
              fontSize: "14px", 
              outline: "none", 
              cursor: "text",
              borderRadius: "4px",
              margin: "0 2px",
            }}
            onFocus={(e) => {
              isTypingFontSize.current = true;
              e.target.style.border = "1px solid #1a73e8";
              e.target.select();
            }}
            onBlur={(e) => {
              e.target.style.border = "1px solid transparent";
              const val = parseInt(e.target.value);
              if (val) {
                updateFontSize(val);
              } else {
                setInputValue(fontSize.toString()); 
              }
              setTimeout(() => { isTypingFontSize.current = false; }, 150); 
            }}
          />
          <button style={btnStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => {e.preventDefault(); updateFontSize(fontSize + 1)}} title="Increase font size">+</button>
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

      <div style={{ position: "relative" }} ref={textColorRef}>
        <button 
          style={{ ...btnStyle, flexDirection: "column", padding: "4px 6px" }} 
          onClick={() => setIsTextColorOpen(!isTextColorOpen)}
          title="Text color"
        >
          <Baseline size={18} />
          <div style={{ width: "16px", height: "3px", backgroundColor: textColor, marginTop: "1px" }} />
        </button>
        {isTextColorOpen && (
          <div style={{ position: "absolute", top: "40px", left: "-80px", zIndex: 1000 }}>
            <ColorPicker 
              activeColor={textColor} 
              onSelect={(color) => {
                setTextColor(color);
                applyCommand("foreColor", color);
                setIsTextColorOpen(false);
              }} 
            />
          </div>
        )}
      </div>

      <div style={{ position: "relative" }} ref={highlightColorRef}>
        <button 
          style={{ ...btnStyle, flexDirection: "column", padding: "4px 6px" }} 
          onClick={() => setIsHighlightColorOpen(!isHighlightColorOpen)}
          title="Highlight color"
        >
          <Highlighter size={18} />
          <div style={{ width: "16px", height: "3px", backgroundColor: highlightColor, marginTop: "1px" }} />
        </button>
        {isHighlightColorOpen && (
          <div style={{ position: "absolute", top: "40px", left: "-80px", zIndex: 1000 }}>
            <ColorPicker 
              activeColor={highlightColor} 
              onSelect={(color) => {
                setHighlightColor(color);
                applyCommand("hiliteColor", color);
                setIsHighlightColorOpen(false);
              }} 
            />
          </div>
        )}
      </div>

      <Divider />

      <button style={btnStyle} title="Insert Link" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => { e.preventDefault(); const url = prompt("Enter Link URL:"); if (url) applyCommand("createLink", url); }}><Link size={18} /></button>
      <button style={btnStyle} title="Insert Image" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => { e.preventDefault(); const url = prompt("Enter Image URL:"); if (url) applyCommand("insertImage", url); }}><Image size={18} /></button>

      <Divider />

      <button style={getBtnStyle(activeFormats.align === "left")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.align === "left")} onMouseDown={(e) => {e.preventDefault(); applyCommand("justifyLeft")}} title="Align Left"><AlignLeft size={18} /></button>
      <button style={getBtnStyle(activeFormats.align === "center")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.align === "center")} onMouseDown={(e) => {e.preventDefault(); applyCommand("justifyCenter")}} title="Align Center"><AlignCenter size={18} /></button>
      <button style={getBtnStyle(activeFormats.align === "right")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.align === "right")} onMouseDown={(e) => {e.preventDefault(); applyCommand("justifyRight")}} title="Align Right"><AlignRight size={18} /></button>
      
      <Divider />

      <button style={getBtnStyle(activeFormats.list === "bullet")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.list === "bullet")} onMouseDown={(e) => {e.preventDefault(); applyCommand("insertUnorderedList")}} title="Bulleted list"><List size={18} /></button>
      <button style={getBtnStyle(activeFormats.list === "number")} onMouseEnter={handleMouseEnter} onMouseLeave={(e) => handleMouseLeave(e, activeFormats.list === "number")} onMouseDown={(e) => {e.preventDefault(); applyCommand("insertOrderedList")}} title="Numbered list"><ListOrdered size={18} /></button>

      <Divider />

      <button style={btnStyle} title="Clear formatting" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={(e) => { e.preventDefault(); applyCommand("removeFormat"); }}><Type size={18} /></button>

    </div>
  );
};

export default Toolbar;