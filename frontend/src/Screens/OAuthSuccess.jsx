import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { refreshProfiles } = useContext(ProfileContext);

  useEffect(() => {
    const hash = window.location.hash;
    const queryString = hash.includes("?") ? hash.split("?")[1] : "";
    const token = new URLSearchParams(queryString).get("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const finishLogin = async () => {
      // Clear any stale profile selection from a previous session
      localStorage.removeItem("currentProfileId");
      
      // Store token 
      localStorage.setItem("token", token);

      if (refreshProfiles) {
        await refreshProfiles();
      }

      navigate("/dashboard");
    };

    finishLogin();
  }, []); 

  return (
    <div style={{ padding: 40 }}>
      Logging you in with Google...
    </div>
  );
}