const API_URL = "http://localhost:8000/api";

// Fetch folders for the current user
export const getFolders = async (profileId) => {
  const token = localStorage.getItem("token");

  // Use profileId from localStorage if not provided
  if (!profileId) profileId = localStorage.getItem("currentProfileId"); 
  if (!profileId) throw new Error("No profile selected");

  const url = new URL(`${API_URL}/folders/`);
  if (profileId) url.searchParams.append("profile_id", profileId);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch folders error:", errorText);
    throw new Error("Failed to fetch folders");
  }

  return response.json();
};

// Create a new folder
export const createFolder = async (name, profileId, parentId = null) => {
  const token = localStorage.getItem("token");

  // Use profileId from localStorage if not provided
  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  if (!profileId) throw new Error("No profile selected");

  const response = await fetch(`${API_URL}/folders/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      profile_id: profileId,
      parent_id: parentId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create folder error:", errorText);
    throw new Error("Failed to create folder");
  }

  return response.json();
};

// Delete a folder
export const deleteFolder = async (folderId, profileId) => {
  const token = localStorage.getItem("token");

  // Use profileId from localStorage if not provided
  if (!profileId) profileId = localStorage.getItem("currentProfileId"); 
  if (!profileId) throw new Error("No profile selected");

  const url = new URL(`${API_URL}/folders/${folderId}`);
  if (profileId) url.searchParams.append("profile_id", profileId);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Delete folder error:", errorText);
    throw new Error("Failed to delete folder");
  }

  return true;
};