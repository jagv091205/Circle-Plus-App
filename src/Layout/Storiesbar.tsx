import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

const StoriesBar = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, user:profiles(username, avatar_url)")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (!error && data) {
        setStories(data);
      }
    };

    fetchStories();
  }, []);

  return (
    <div className="flex space-x-4 p-2 overflow-x-auto border-b border-gray-300">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center">
          <img
            src={story.user.avatar_url}
            className="w-12 h-12 rounded-full border-2 border-pink-500 object-cover"
            alt="story avatar"
          />
          <span className="text-xs mt-1">{story.user.username}</span>
        </div>
      ))}
    </div>
  );
};

export default StoriesBar;