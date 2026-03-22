/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, createContext } from "react";

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
        const res = await fetch("http://localhost:8000/api/profiles/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch profiles");

        const data = await res.json();

        // Remove "Default" profile from the list
        const cleanedData = data.filter((p) => p.name !== "Default");

        setProfiles(cleanedData);

        const savedProfileId = localStorage.getItem("currentProfileId");

        let initialProfile = null;

        //  restoring previously selected profile
        if (savedProfileId) {
          initialProfile = cleanedData.find(
            (p) =>
              p.id === savedProfileId ||
              p.id === Number(savedProfileId)
          );
        }

        //  Use backend default (is_default = true)
        if (!initialProfile) {
          initialProfile = cleanedData.find((p) => p.is_default);
        }

        //  Fallback to first profile
        if (!initialProfile) {
          initialProfile = cleanedData[0] || null;
        }

        setCurrentProfile(initialProfile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Persist selected profile
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