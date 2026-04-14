import dotenv from "dotenv";
dotenv.config();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.log("No key");
} else {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString());
    console.log("Role:", payload.role);
  } catch (e) {
    console.log("Invalid JWT");
  }
}
