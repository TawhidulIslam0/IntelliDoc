/* eslint-disable no-unused-vars */
import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";
import logo from "../assets/file_icon_logo.png";
import logoutIcon from "../assets/logout.png";
import { getFiles, getPreviewUrl } from "../api/fileService";
import { getFolders } from "../api/folderService";
import docxIcon from "../assets/docx_icon.png";
import pdfIcon from "../assets/pdf_icon.png";
import txtIcon from "../assets/txt_icon.png";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const {
    profiles = [],
    currentProfile,
    setCurrentProfile,
  } = useContext(ProfileContext);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ files: [], folders: [] });
  const [isSearching, setIsSearching] = useState(false);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Live Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length > 0) {
        setIsSearching(true);
        try {
          if (query.toLowerCase() === "type:folder") {
            const folders = await getFolders(currentProfile?.id, null, query);
            setSearchResults({ files: [], folders: folders });
          } else {
            const [files, folders] = await Promise.all([
              getFiles(currentProfile?.id, null, query),
              !query.startsWith("type:") ? getFolders(currentProfile?.id, null, query) : Promise.resolve([])
            ]);

            setSearchResults({
              files: files.filter(f => f.type !== "folder"),
              folders: folders
            });
          }
        } catch (err) {
          console.error("Search fetch error:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ files: [], folders: [] });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentProfile]);

  // Click Outside logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSwitchProfile = (profile) => {
    setCurrentProfile(profile);
    setShowDropdown(false);
  };

  const handleResultClick = async (item, type) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    setSearchResults({ files: [], folders: [] });

    if (type === 'folder' || item.type === 'folder') {
      navigate(`/dashboard?folderId=${item.id}`);
      return;
    }

    const fileName = item.name?.toLowerCase() || "";

    const isExternalFile = fileName.endsWith(".pdf") || fileName.endsWith(".txt") || fileName.endsWith(".docx");

    if (isExternalFile) {
      try {
        const { url } = await getPreviewUrl(item.id);
        navigate("/dashboard", { state: { openPreviewUrl: url } });
      } catch (err) {
        console.error("Failed to fetch preview for search result:", err);
        alert("Could not open preview.");
      }
    } else {
      navigate(`/editor/${item.id}`);
    }
  };

  const groupedProfiles = profiles.reduce((acc, profile) => {
    const type = profile.type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(profile);
    return acc;
  }, {});

  return (
    <header style={{
      height: "64px", backgroundColor: "white", display: "flex",
      alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", borderBottom: "1px solid #E5E7EB",
      position: "relative"
    }}>
      {/* LEFT: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
        <img src={logo} alt="logo" style={{ width: "28px", height: "28px" }} />
        <span style={{ fontSize: "20px", fontWeight: "500", color: "#5F6368" }}>IntelliDoc</span>
      </div>

      {/* MIDDLE: Search Bar */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }} ref={searchRef}>
        <div style={{ position: "relative", width: "100%", maxWidth: "700px" }}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            onMouseOver={(e) => {
              if (!showSearchDropdown) e.currentTarget.style.backgroundColor = "#DADCE0";
            }}
            onMouseOut={(e) => {
              if (!showSearchDropdown) e.currentTarget.style.backgroundColor = "#F1F3F4";
            }}
            style={{
              width: "100%",
              padding: "12px 20px 12px 45px",
              borderRadius: "8px",
              border: "none",
              outline: "none",
              backgroundColor: showSearchDropdown ? "white" : "#F1F3F4",
              boxShadow: showSearchDropdown ? "0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)" : "none",
              transition: "background 0.2s, box-shadow 0.2s",
              fontSize: "16px"
            }}
          />
          <span style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#5F6368" }}>
            🔍
          </span>

          {showSearchDropdown && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              backgroundColor: "white", borderRadius: "0 0 8px 8px",
              boxShadow: "0 4px 6px rgba(32,33,36,0.28)",
              zIndex: 1000, overflow: "hidden", borderTop: "1px solid #E5E7EB"
            }}>
              {searchQuery.length === 0 ? (
                <div style={{ padding: "8px 0" }}>
                  <div style={{ padding: "10px 20px", color: "#5F6368", fontSize: "12px", fontWeight: "bold" }}>SEARCH FILTERS</div>
                  <div style={filterItemStyle} onClick={() => setSearchQuery("type:document")} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <span style={{ marginRight: "12px" }}><img src={logo} alt="doc" style={{ width: "18px", height: "18px" }} /></span> Documents
                  </div>
                  <div style={filterItemStyle} onClick={() => setSearchQuery("type:folder")} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <span style={{ marginRight: "12px" }}>📁</span> Folders
                  </div>
                  <div style={filterItemStyle} onClick={() => setSearchQuery("type:pdf")} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <span style={{ marginRight: "12px" }}><img src={pdfIcon} alt="pdf" style={{ width: "18px", height: "18px" }} /></span> PDFs
                  </div>
                  <div style={filterItemStyle} onClick={() => setSearchQuery("type:txt")} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <span style={{ marginRight: "12px" }}><img src={txtIcon} alt="txt" style={{ width: "18px", height: "18px" }} /></span> Text Files
                  </div>
                  <div style={filterItemStyle} onClick={() => setSearchQuery("type:docx")} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <span style={{ marginRight: "12px" }}><img src={docxIcon} alt="docx" style={{ width: "18px", height: "18px" }} /></span> Word Documents
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {isSearching ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#5F6368" }}>Searching...</div>
                  ) : (
                    <>
                      {searchResults.folders.map(folder => (
                        <div key={folder.id} style={resultItemStyle} onClick={() => handleResultClick(folder, 'folder')} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                          <span style={{ marginRight: "12px" }}>📁</span> {folder.name}
                        </div>
                      ))}
                      {searchResults.files.map(file => (
                        <div key={file.id} style={resultItemStyle} onClick={() => handleResultClick(file, 'file')} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                          <span style={{ marginRight: "12px", display: "flex", alignItems: "center", width: "20px" }}>
                            {file.name.toLowerCase().endsWith('.pdf') ? <img src={pdfIcon} alt="pdf" style={{ width: "20px", height: "20px" }} /> :
                             file.name.toLowerCase().endsWith('.txt') ? <img src={txtIcon} alt="txt" style={{ width: "20px", height: "20px" }} /> : 
                             file.name.toLowerCase().endsWith('.docx') ? <img src={docxIcon} alt="docx" style={{ width: "20px", height: "20px" }} /> : 
                             <img src={logo} alt="doc" style={{ width: "20px", height: "20px" }} />}
                          </span> {file.name.replace(/\.idoc$/, "")}
                        </div>
                      ))}
                      {searchResults.files.length === 0 && searchResults.folders.length === 0 && (
                        <div style={{ padding: "20px", textAlign: "center", color: "#5F6368" }}>No matches found.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: User and Profile Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }} ref={dropdownRef}>
        {user && <span style={{ fontWeight: "500", color: "#202124" }}>{user.username}</span>}
        {currentProfile && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={profileButtonStyle}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#E8EAED"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"}
            >
              {currentProfile.name} ▼
            </button>
            {showDropdown && (
              <div style={profileDropdownStyle}>
                {Object.keys(groupedProfiles).map((type) => {
                  const group = groupedProfiles[type].filter(p => p.id !== currentProfile?.id);
                  if (group.length === 0) return null;
                  return (
                    <div key={type}>
                      <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#5F6368", textTransform: "uppercase" }}>{type}</div>
                      {group.map(p => (
                        <div key={p.id} onClick={() => handleSwitchProfile(p)} style={dropdownItemStyle} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Logout Icon */}
        <div
          onClick={handleLogout}
          style={{
            padding: "8px", borderRadius: "50%", cursor: "pointer", transition: "background-color 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#E8EAED"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <img src={logoutIcon} alt="logout" style={{ width: "20px", height: "20px", display: "block" }} />
        </div>
      </div>
    </header>
  );
}

const filterItemStyle = {
  padding: "10px 24px", cursor: "pointer", display: "flex", alignItems: "center", color: "#3C4043", fontSize: "14px",
  transition: "background 0.2s", backgroundColor: "transparent"
};

const resultItemStyle = {
  padding: "10px 24px", cursor: "pointer", display: "flex", alignItems: "center", borderBottom: "1px solid #f1f3f4",
  fontSize: "14px", color: "#202124", transition: "background 0.2s"
};

const profileButtonStyle = {
  padding: "6px 12px", backgroundColor: "#F1F3F4", border: "none", borderRadius: "6px", cursor: "pointer", color: "#202124", fontWeight: "500", transition: "background 0.2s"
};

const profileDropdownStyle = {
  position: "absolute", top: "42px", right: 0, backgroundColor: "white", border: "1px solid #DADCE0",
  borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: "180px"
};

const dropdownItemStyle = {
  padding: "8px 14px", cursor: "pointer", color: "#202124", transition: "background 0.2s"
};