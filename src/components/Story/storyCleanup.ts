// src/utils/storyCleanup.ts
import { supabase } from "../../services/supabaseClient";

export const cleanupExpiredStories = async () => {
  try {
    const { error } = await supabase
      .from("stories")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) {
      console.error("Error cleaning up expired stories:", error);
    }
  } catch (error) {
    console.error("Error in story cleanup:", error);
  }
};

// Call this periodically (e.g., every hour)
setInterval(cleanupExpiredStories, 60 * 60 * 1000);