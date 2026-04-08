import React from 'react';
import renameFileIcon from '../assets/renamefile.png';
import renameFolderIcon from '../assets/renamefolder.png';
import downloadFileIcon from '../assets/downloadfilebutton.png';
import deleteFileIcon from '../assets/deletefilebutton.png';
import deleteFolderIcon from '../assets/deletefolderbutton.png';

export default function ContextMenu({ x, y, type, item, onClose, onAction }) {
  
  // Decide which icons and visibility logic to use
  const isFolder = type === 'folder';
  const isDoc = type === 'doc';
  const isFile = type === 'file';

  const renameIcon = isFolder ? renameFolderIcon : renameFileIcon;
  const downloadIcon = downloadFileIcon; 
  const deleteIcon = isFolder ? deleteFolderIcon : deleteFileIcon;

  // The floating container style
  const menuStyle = {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    backgroundColor: '#fff',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 2000, // Make sure it stays above everything
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
    transition: 'background-color 0.1s',
  };

  return (
    <>
      {/* Invisible backdrop: clicking anywhere else closes the menu */}
      <div 
        onClick={onClose} 
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }} 
      />

      <div style={menuStyle}>
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
        {(isDoc || isFile) && (
          <div 
            style={itemStyle} 
            className="context-menu-item"
            onClick={() => { onAction('download', item); onClose(); }}
          >
            <img src={downloadIcon} alt="download" width="18" height="18" />
            <span>Download</span>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e8eaed', margin: '4px 0' }} />

        {/* DELETE */}
        <div 
          style={{ ...itemStyle, color: '#d93025' }} 
          className="context-menu-item"
          onClick={() => { onAction('delete', item); onClose(); }}
        >
          <img src={deleteIcon} alt="delete" width="18" height="18" />
          <span>Remove</span>
        </div>
      </div>

      {/* Basic hover effect */}
      <style>{`
        .context-menu-item:hover {
          background-color: #f1f3f4;
        }
      `}</style>
    </>
  );
}