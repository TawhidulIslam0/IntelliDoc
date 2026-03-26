import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";
import logo from "../assets/file_icon_logo.png";
import logoutIcon from "../assets/logout.png";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profiles = [],
    currentProfile,
    setCurrentProfile,
    loading,
  } = useContext(ProfileContext);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Profile switch handler
  const handleSwitchProfile = (profile) => {
    setCurrentProfile(profile);
    setShowDropdown(false);
  };

  // Group profiles by type (personal, school, work)
  const groupedProfiles = profiles.reduce((acc, profile) => {
    const type = profile.type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(profile);
    return acc;
  }, {});

  // Other profiles to show in dropdown (excluding current)
  const otherProfiles = profiles.filter((p) => p.id !== currentProfile?.id);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle clicking the logo
  const handleLogoClick = () => {
    if (location.pathname === "/dashboard") {
      window.location.reload(); // refresh if already on dashboard
    } else {
      navigate("/dashboard"); // navigate to dashboard
    }
  };

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      {/* LEFT: Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        onClick={handleLogoClick}
      >
        <img src={logo} alt="logo" style={{ width: "28px", height: "28px" }} />
        <span
          style={{
            fontSize: "20px",
            fontWeight: "500",
            color: "#5F6368",
          }}
        >
          IntelliDoc
        </span>
      </div>

      {/* RIGHT: User + Profile + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }} ref={dropdownRef}>
        {user && <span style={{ fontWeight: "500", color: "#202124" }}>{user.username}</span>}

        {loading ? (
          <span style={{ color: "#5F6368" }}>Loading...</span>
        ) : (
          currentProfile && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#F1F3F4",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#202124",
                  fontWeight: "500",
                }}
              >
                {currentProfile.name} ▼
              </button>

              {showDropdown && otherProfiles.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "42px",
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #DADCE0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 100,
                    minWidth: "180px",
                  }}
                >
                  {Object.keys(groupedProfiles).map((type) => {
                    const group = groupedProfiles[type].filter(
                      (p) => p.id !== currentProfile?.id
                    );
                    if (group.length === 0) return null;

                    return (
                      <div key={type}>
                        <div
                          style={{
                            padding: "6px 14px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#5F6368",
                            textTransform: "uppercase",
                          }}
                        >
                          {type}
                        </div>

                        {group.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSwitchProfile(p)}
                            style={{
                              padding: "8px 14px",
                              cursor: "pointer",
                              color: "#202124",
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = "#F1F3F4")}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* Logout Icon */}
        <img
          src={logoutIcon}
          alt="logout"
          onClick={handleLogout}
          style={{ width: "20px", height: "20px", cursor: "pointer", opacity: 0.7 }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.7)}
        />
      </div>
    </header>
  );
}