const API_URL = "http://localhost:8000/api";

// Fetch folders for the current user - Updated to support search
export const getFolders = async (profileId, parentId = null, search = "") => {
  const token = localStorage.getItem("token");

  // Use profileId from localStorage if not provided
  if (!profileId) profileId = localStorage.getItem("currentProfileId"); 
  if (!profileId) throw new Error("No profile selected");

  const url = new URL(`${API_URL}/folders/`);
  url.searchParams.append("profile_id", profileId);

  // If searching ignore parentId to search everywhere
  // If not searching use parentId to show the current level
  if (search) {
    url.searchParams.append("search", search);
  } else if (parentId) {
    url.searchParams.append("parent_id", parentId);
  }

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

  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  if (!profileId) throw new Error("No profile selected");

  const sanitizedParentId = parentId === "" ? null : parentId;

  const response = await fetch(`${API_URL}/folders/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      profile_id: profileId,
      parent_id: sanitizedParentId, 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create folder error:", errorText);
    throw new Error("Failed to create folder");
  }

  return response.json();
};
// Rename a folder
export const renameFolder = async (folderId, newName) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/folders/${folderId}/rename`, {
    method: "PATCH", 
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Rename folder error:", errorText);
    throw new Error("Failed to rename folder");
  }

  return response.json();
};

// Download a folder with all its contents
export const downloadFolder = async (folderId, profileId) => {
  const token = localStorage.getItem("token");

  if (!profileId) profileId = localStorage.getItem("currentProfileId");
  if (!profileId) throw new Error("No profile selected");

  const url = new URL(`${API_URL}/files/folders/${folderId}/export`);
  url.searchParams.append("profile_id", profileId);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Download folder error:", errorText);
    throw new Error("Failed to download folder");
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "folder.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

// Delete a folder
export const deleteFolder = async (folderId, profileId) => {
  const token = localStorage.getItem("token");

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