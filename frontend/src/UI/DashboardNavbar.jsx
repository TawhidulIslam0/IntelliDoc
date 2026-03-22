import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const { profiles = [], currentProfile, setCurrentProfile, loading } = useContext(ProfileContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Profile switch handler
  const handleSwitchProfile = (profile) => {
    if (window.confirm(`Switch to "${profile.name}" profile?`)) {
      setCurrentProfile(profile);
      setShowDropdown(false);
    }
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

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* Left: App Name */}
      <div style={{ fontSize: "22px", color: "#2563EB", fontWeight: "700" }}>
        IntelliDoc
      </div>

      {/* Center: Profile dropdown */}
      <div style={{ position: "relative" }} ref={dropdownRef}>
        {loading && (
          <span
            style={{
              padding: "6px 18px",
              backgroundColor: "#E0E7FF",
              color: "#1E40AF",
              borderRadius: "999px",
              fontWeight: "500",
            }}
          >
            Loading...
          </span>
        )}

        {currentProfile && !loading && (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              padding: "6px 18px",
              backgroundColor: "#E0E7FF",
              color: "#1E40AF",
              border: "none",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {currentProfile.name} ▼
          </button>
        )}

        {showDropdown && otherProfiles.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: 0,
              backgroundColor: "white",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 100,
              minWidth: "160px",
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
                      padding: "6px 16px",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#6B7280",
                      textTransform: "uppercase",
                    }}
                  >
                    {type}
                  </div>
                  {group.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => handleSwitchProfile(p)}
                      style={{
                        padding: "8px 16px",
                        cursor: "pointer",
                        borderBottom:
                          idx !== group.length - 1 ? "1px solid #E5E7EB" : "none",
                        color: "#111827",
                      }}
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

      {/* Right: User Info and Logout */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: "500", color: "#111827" }}>
            {user.username}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#FECACA",
              color: "#B91C1C",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}