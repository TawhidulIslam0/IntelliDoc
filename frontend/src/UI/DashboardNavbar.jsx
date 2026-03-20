import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext"; // import context

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();
  const { profiles, currentProfile, setCurrentProfile, loading } = useContext(ProfileContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove JWT
    navigate("/login"); // redirect to login
  };

  const handleSwitchProfile = (profile) => {
    const confirmSwitch = window.confirm(
      `Do you want to switch to the "${profile.name}" profile?`
    );
    if (confirmSwitch) {
      setCurrentProfile(profile);
      setShowDropdown(false);
    }
  };

  const otherProfiles = profiles.filter((p) => p.id !== currentProfile?.id);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debug: check what profile is currently loaded
  useEffect(() => {
    console.log("Current profile:", currentProfile);
  }, [currentProfile]);

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
      <div
        style={{
          fontSize: "22px",
          color: "#2563EB",
          fontWeight: "700",
        }}
      >
        IntelliDoc
      </div>

      {/* Center: Current Profile */}
      <div style={{ position: "relative" }} ref={dropdownRef}>
        {/* Show loading placeholder if profiles are still loading */}
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

        {/* Dropdown with other profiles */}
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
            }}
          >
            {otherProfiles.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => handleSwitchProfile(p)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  borderBottom: idx !== otherProfiles.length - 1 ? "1px solid #E5E7EB" : "none",
                  color: "#111827",
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: User Info and Logout */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: "500", color: "#111827" }}>{user.username}</span>
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