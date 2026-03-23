import { useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ProfileContext } from "../UI/ProfileContext";

export default function OAuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfiles } = useContext(ProfileContext);

  useEffect(() => {
    const token = params.get("token");

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