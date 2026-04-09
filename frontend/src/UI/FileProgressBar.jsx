import React from 'react';
/**
 * @param {number} progress - Current upload percentage (0-100)
 * @param {string} fileName - Name of the file being processed
 * @param {boolean} isUploading - Whether the upload is currently active
 * @param {string} error - Error message if the upload fails
 */
const FileProgressBar = ({ progress, fileName, isUploading, error }) => {
  // Hide the component if there's no active upload, no error, and no progress
  if (!isUploading && !error && (progress === 0 || progress === 100)) {
    return null;
  }

  // Colors
  const tealMain = "#1abc9c";
  const tealLightText = "#2ecc71"; 
  const redError = "#e74c3c"; 
  const greenSuccess = "#27ae60"; 
  const greyTrack = "#e0e0e0";

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
      <div style={{ display: "flex", itemsCenter: "center", justifyContent: "space-between", marginBottom: 10 }}>
        
        {/*File Info & Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          
          {/* Badge */}
          <div style={{
            backgroundColor: "#a3f7e1", // Very light teal background
            color: tealLightText,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: 20,
            letterSpacing: "0.5px"
          }}>
            In Progress
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {fileName || 'Uploading...'}
            </span>
            <span style={{ fontSize: 11, color: "#5f6368" }}>
              {error ? 'Upload failed' : isUploading && progress < 100 ? 'Uploading to S3...' : 'Finalizing...'}
            </span>
          </div>
        </div>

        {/* Percentage */}
        <span style={{ fontSize: 13, fontWeight: 700, color: tealLightText }}>
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
            transition: "width 0.4s ease-out", // Transition from previous recommendation
            // Switch color on error
            backgroundColor: error ? redError : tealMain,
            width: `${progress}%`
          }}
        />
      </div>

      {/* Footer Status */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {error ? (
          <p style={{ fontSize: 11, color: redError, fontWeight: 500, margin: 0 }}>
            Error: {error}
          </p>
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