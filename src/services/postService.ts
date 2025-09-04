import { supabase } from "./supabaseClient";

export const fetchPostsForCircle = async (circleId: string) => {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        content,
        image_url,
        created_at,
        profiles:author_id (
          username,
          avatar_url
        )
      `
    )
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error.message);
    return [];
  }

  return data?.map((post: any) => ({
    ...post,
    profiles: post.profiles[0], // unwrap
  }));
};

