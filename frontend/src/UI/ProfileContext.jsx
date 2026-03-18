import React, { useState, useEffect } from "react";
import { ProfileContext } from "./ProfileContext";

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:8000/api/profiles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profiles");
        const data = await res.json();
        setProfiles(data);

        // Default to "Personal" if it exists, otherwise first profile
        const personal = data.find((p) => p.name === "Personal");
        setCurrentProfile(personal || data[0]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfiles();
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profiles, currentProfile, setCurrentProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
};