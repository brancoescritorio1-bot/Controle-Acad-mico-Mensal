import dotenv from "dotenv";
dotenv.config();

const urlRaw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const url = urlRaw.split('/rest/v1/')[0].replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.log("No key");
} else {
  const authUrl = `${url}/auth/v1/admin/users`;
  console.log("Fetching from direct URL:", authUrl);
  
  fetch(authUrl, {
    method: "GET",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  })
  .then(async (res) => {
    console.log("Status:", res.status);
    console.log("StatusText:", res.statusText);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Response body:", text);
  })
  .catch((err) => {
    console.error("Fetch error:", err);
  });
}
