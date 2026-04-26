import React, { useEffect } from 'react';

/**
 * @param {number} progress - Current upload percentage (0-100)
 * @param {string} fileName - Name of the file being processed
 * @param {boolean} isUploading - Whether the upload is currently active
 * @param {string} error - Error message if the upload fails
 * @param {boolean} isInterrupted - Whether the upload is paused/interrupted
 * @param {function} onResume - Callback to trigger the resume logic
 * @param {function} onComplete - Callback to trigger auto-dismissal after 100%
 * @param {function} onDismiss - Callback to manually dismiss error
 */
const FileProgressBar = ({ progress, fileName, isUploading, error, isInterrupted, onResume, onComplete, onDismiss }) => {
  
  // Auto-dismissal for success
  useEffect(() => {
    let timer;
    if (progress === 100 && !error && onComplete) {
      timer = setTimeout(() => {
        onComplete();
      }, 1500); 
    }
    return () => clearTimeout(timer);
  }, [progress, error, onComplete]);

  // If it's not uploading, not failed, and not interrupted, hide the component.
  if (!isUploading && !error && !isInterrupted) {
    return null;
  }

  // Colors
  const tealMain = "#1abc9c";
  const tealLightText = "#2ecc71"; 
  const redError = "#e74c3c"; 
  const greenSuccess = "#27ae60"; 
  const greyTrack = "#e0e0e0";
  const amberWarning = "#f39c12"; 

  // Dynamic Badge Styling
  const getBadgeStyle = () => {
    if (isInterrupted) return { backgroundColor: "#fff3cd", color: amberWarning };
    if (error) return { backgroundColor: "#fdecea", color: redError };
    return { backgroundColor: "#a3f7e1", color: tealLightText };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div style={{
      width: "100%",
      backgroundColor: "white",
      border: "1px solid #dadce0",
      borderRadius: 8,
      padding: "15px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      margin: "20px 0",
      boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        
        {/* File Info & Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          
          {/* Badge */}
          <div style={{
            ...badgeStyle,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: 20,
            letterSpacing: "0.5px"
          }}>
            {isInterrupted ? "Paused" : error ? "Error" : "In Progress"}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {fileName || 'Uploading...'}
            </span>
            <span style={{ fontSize: 11, color: "#5f6368" }}>
              {error ? 'Upload failed' : isInterrupted ? 'Upload interrupted' : isUploading && progress < 100 ? 'Uploading to S3...' : 'Finalizing...'}
            </span>
          </div>
        </div>

        {/* Percentage */}
        <span style={{ fontSize: 13, fontWeight: 700, color: isInterrupted ? amberWarning : tealLightText }}>
          {progress}%
        </span>
      </div>

      {/* Progress Bar Track */}
      <div style={{
        width: "100%",
        backgroundColor: greyTrack,
        borderRadius: 20,
        height: 8,
        overflow: "hidden"
      }}>
        {/* Fill Level */}
        <div
          style={{
            height: "100%",
            borderRadius: 20,
            transition: "width 0.4s ease-out",
            backgroundColor: error ? redError : isInterrupted ? amberWarning : tealMain,
            width: `${progress}%`
          }}
        />
      </div>

      {/* Footer Status */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {error ? (
          <>
            <p style={{ fontSize: 11, color: redError, fontWeight: 500, margin: 0 }}>
              Error: {error}
            </p>
            {onDismiss && (
                <button onClick={onDismiss} style={{ fontSize: 10, cursor: 'pointer', background: 'transparent', border: 'none', color: '#5f6368', textDecoration: 'underline' }}>
                    Dismiss
                </button>
            )}
          </>
        ) : isInterrupted ? (
            <button 
                onClick={onResume}
                style={{
                    backgroundColor: amberWarning,
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontWeight: "600"
                }}
            >
                Resume Upload
            </button>
        ) : (
          progress === 100 && (
            <p className="animate-pulse" style={{ fontSize: 11, color: greenSuccess, fontWeight: 500, margin: 0 }}>
              Success! Syncing with database...
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default FileProgressBar;