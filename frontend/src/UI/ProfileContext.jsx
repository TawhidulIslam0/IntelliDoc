/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, createContext } from "react";

// Create the context
export const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        let res = await fetch("http://localhost:8000/api/profiles/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch profiles");

        let data = await res.json();

        // If no profiles exist, create defaults
        if (data.length === 0) {
          const defaultProfiles = ["Personal", "School", "Work"];
          const createdProfiles = [];

          for (const name of defaultProfiles) {
            const createRes = await fetch("http://localhost:8000/api/profiles/", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name }),
            });

            if (!createRes.ok) {
              console.error(`Failed to create profile: ${name}`);
              continue;
            }

            const createdProfile = await createRes.json();
            createdProfiles.push(createdProfile);
          }

          data = createdProfiles;
        }

        setProfiles(data);

        // Check if a profile was saved in localStorage
        const savedProfileId = localStorage.getItem("currentProfileId");
        let initialProfile = savedProfileId
          ? data.find((p) => p.id.toString() === savedProfileId)
          : data.find((p) => p.name === "Personal");

        // Fallback: first profile
        initialProfile = initialProfile || data[0];

        setCurrentProfile(initialProfile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Save selected profile in localStorage whenever it changes
  useEffect(() => {
    if (currentProfile) {
      localStorage.setItem("currentProfileId", currentProfile.id);
    }
  }, [currentProfile]);

  return (
    <ProfileContext.Provider
      value={{ profiles, currentProfile, setCurrentProfile, loading }}
    >
      {children}
    </ProfileContext.Provider>
  );
};