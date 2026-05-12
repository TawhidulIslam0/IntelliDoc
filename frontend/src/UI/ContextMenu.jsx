/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useLayoutEffect, useRef, useState } from 'react';
import renameFileIcon from '../assets/renamefile.png';
import renameFolderIcon from '../assets/renamefolder.png';
import downloadFileIcon from '../assets/downloadfilebutton.png';
import deleteFileIcon from '../assets/deletefilebutton.png';
import deleteFolderIcon from '../assets/deletefolderbutton.png';
import restoreFileIcon from '../assets/restore_file_icon.png';
import restoreFolderIcon from '../assets/restore_folder_icon.png';
import pdfIcon from '../assets/pdf_icon.png';
import docxIcon from '../assets/docx_icon.png';
import txtIcon from '../assets/txt_icon.png';

export default function ContextMenu({ x, y, type, item, onClose, onAction }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ x, y });
    // State to toggle between main menu and download format selection
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  const isDeletedItem = item.is_deleted === true || item.deleted_at != null;

  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;

    let nextX = x;
    let nextY = y;

    if (nextX + rect.width > window.innerWidth - padding) {
      nextX = window.innerWidth - rect.width - padding;
    }
    if (nextY + rect.height > window.innerHeight - padding) {
      nextY = window.innerHeight - rect.height - padding;
    }

    if (nextX < padding) nextX = padding;
    if (nextY < padding) nextY = padding;

    setPosition({ x: nextX, y: nextY });
  }, [x, y, type]);

    // Decide which icons and visibility logic to use
  const isFolder = type === 'folder';
  const isDoc = type === 'doc';
  const isFile = type === 'file';

  const renameIcon = isFolder ? renameFolderIcon : renameFileIcon;
  const deleteIcon = isFolder ? deleteFolderIcon : deleteFileIcon;
  const restoreIcon = isFolder ? restoreFolderIcon : restoreFileIcon;
  const downloadIcon = downloadFileIcon;

    // Logic to determine if we show the "Download as..." in submenu
  const canShowExportOptions = isDoc && !isDeletedItem;

  const handleDownloadClick = () => {
    if (canShowExportOptions) {
      setShowDownloadOptions(true);
    } else {
       // For standard uploaded files/folders, just trigger a normal download
      onAction('download', item);
      onClose();
    }
  };

  // The floating container style
  const menuStyle = {
    position: 'fixed',
    top: `${position.y}px`,
    left: `${position.x}px`,
    backgroundColor: '#fff',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 2000, 
    minWidth: '180px',
    padding: '6px 0',
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3c4043',
  };

  return (
    <>
     {/* Invisible backdrop: clicking anywhere else closes the menu */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />

      <div ref={menuRef} style={menuStyle}>
        {showDownloadOptions ? (
          /* DOWNLOAD SUBMENU for idocs files */
          <>
            <div style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', color: '#5f6368' }}>Export as...</div>
            <div style={itemStyle} className="context-menu-item" onClick={() => { onAction('download', { ...item, format: 'pdf' }); onClose(); }}>
              <img src={pdfIcon} alt="pdf" width="18" height="18" /> <span>PDF</span>
            </div>
            <div style={itemStyle} className="context-menu-item" onClick={() => { onAction('download', { ...item, format: 'docx' }); onClose(); }}>
              <img src={docxIcon} alt="docx" width="18" height="18" /> <span>DOCX</span>
            </div>
            <div style={itemStyle} className="context-menu-item" onClick={() => { onAction('download', { ...item, format: 'txt' }); onClose(); }}>
              <img src={txtIcon} alt="txt" width="18" height="18" /> <span>TXT</span>
            </div>
          </>
        ) : (
          <>
            {isDeletedItem ? (
              <>
                {/* RESTORE  */}
                <div 
                  style={itemStyle} 
                  className="context-menu-item"
                  onClick={() => { onAction('restore', item); onClose(); }}
                >
                  <img src={restoreIcon} alt="restore" width="18" height="18" />
                  <span>Restore</span>
                </div>
                
                {/*DELETE*/}
                <div 
                  style={{ ...itemStyle, color: '#d93025' }} 
                  className="context-menu-item"
                  onClick={() => { onAction('permanent_delete', item); onClose(); }}
                >
                  <img src={deleteIcon} alt="delete" width="18" height="18" />
                  <span>Delete Permanently</span>
                </div>
              </>
            ) : (
               /* MAIN CONTEXT MENU */
              <>
                 {/* RENAME */}
            {(isFolder || isDoc) && (
              <div 
                style={itemStyle} 
                className="context-menu-item"
                onClick={() => { onAction('rename', item); onClose(); }}
              >
                <img src={renameIcon} alt="rename" width="18" height="18" />
                <span>Rename</span>
              </div>
            )}

              {/* DOWNLOAD */}
             {(isDoc || isFile || isFolder) && (
              <div 
                style={itemStyle} 
                className="context-menu-item"
                onClick={handleDownloadClick}
              >
                <img src={downloadIcon} alt="download" width="18" height="18" />
                <span>Download{canShowExportOptions ? '...' : ''}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e8e8ed', margin: '4px 0' }} />

                {/* REMOVE */}
                <div 
                  style={{ ...itemStyle, color: '#d93025' }} 
                  className="context-menu-item" 
                  onClick={() => { onAction('delete', item); onClose(); }}
                >
                  <img src={deleteIcon} alt="delete" width="18" height="18" />
                  <span>Remove</span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .context-menu-item:hover {
          background-color: #f1f3f4;
        }
      `}</style>
    </>
  );
}