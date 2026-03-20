import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";

export default function ChooseProfile() {
  const navigate = useNavigate();
  const { profiles, setCurrentProfile, loading, currentProfile } = useContext(ProfileContext);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  useEffect(() => {
    // If a profile is already selected, skip this screen
    if (!loading && currentProfile) {
      navigate("/dashboard");
    }
  }, [loading, currentProfile, navigate]);

  const handleSelectProfile = () => {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      alert("Please select a profile");
      return;
    }
    setCurrentProfile(profile);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading profiles...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Choose Your Profile</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => setSelectedProfileId(profile.id)}
            style={{
              padding: "20px 40px",
              border:
                selectedProfileId === profile.id ? "2px solid #2563EB" : "1px solid #D1D5DB",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: selectedProfileId === profile.id ? "#E0E7FF" : "#fff",
              fontWeight: "500",
            }}
          >
            {profile.name}
          </div>
        ))}
      </div>

      <button
        onClick={handleSelectProfile}
        style={{
          marginTop: "30px",
          padding: "10px 20px",
          backgroundColor: "#2563EB",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Confirm
      </button>
    </div>
  );
}