const API_URL = import.meta.env.VITE_API_URL + "/api/trash";

const getHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

//  Get everything currently in the bin
export const getTrashItems = async (profileId) => {
  console.log("Fetching trash for profile:", profileId); 
  
  if (!profileId) {
    console.warn("No profileId provided to getTrashItems, defaulting to backend default.");
  }

  const response = await fetch(`${API_URL}/?profile_id=${profileId || ''}`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) throw new Error("Failed to fetch trash");
  return response.json();
};

// Restore an item 
export const restoreItem = async (itemId, type) => {
  const segment = type === "folder" ? "folders" : "files";
  const response = await fetch(`${API_URL}/${segment}/${itemId}/restore`, {
    method: "POST",
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Restore failed");
  }
  return response.json();
};

// Permanent Delete 
export const permanentDelete = async (itemId, type) => {
  const segment = type === "folder" ? "folders" : "files";
  const response = await fetch(`${API_URL}/${segment}/${itemId}/permanent`, {
    method: "DELETE",
    headers: getHeaders(), 
  });
  return response.ok;
};

// Empty all files and folder in the bin
export const emptyTrash = async (profileId) => {
  const url = profileId ? `${API_URL}/?profile_id=${profileId}` : `${API_URL}/`;
  
  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to empty trash");
  }
  
  return response.json();
};