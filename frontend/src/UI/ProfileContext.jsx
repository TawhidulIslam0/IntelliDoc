/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, createContext, useCallback } from "react";
export const ProfileContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL;

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Wrapped the fetch logic in useCallback so it can be called manually after login
  const fetchProfiles = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Ensure loading is true while fetching profiles
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/profiles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch profiles");

      const data = await res.json();

      // Remove "Default" profile from the list
      const cleanedData = data.filter((p) => p.name !== "Default");

      setProfiles(cleanedData);

      const savedProfileId = localStorage.getItem("currentProfileId");

      let initialProfile = null;

      // restoring previously selected profile
      if (savedProfileId) {
        initialProfile = cleanedData.find(
          (p) =>
            p.id === savedProfileId ||
            p.id === Number(savedProfileId)
        );
      }

      // Use backend default (is_default = true)
      if (!initialProfile) {
        initialProfile = cleanedData.find((p) => p.is_default);
      }

      // Fallback to first profile
      if (!initialProfile) {
        initialProfile = cleanedData[0] || null;
      }

      setCurrentProfile(initialProfile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Persist selected profile
  useEffect(() => {
    if (currentProfile) {
      localStorage.setItem("currentProfileId", currentProfile.id);
    }
  }, [currentProfile]);

  return (
    <ProfileContext.Provider
      value={{ profiles, currentProfile, setCurrentProfile, loading, refreshProfiles: fetchProfiles }}
    >
      {children}
    </ProfileContext.Provider>
  );
};