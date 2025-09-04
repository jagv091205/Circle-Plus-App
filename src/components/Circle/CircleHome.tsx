import React, { useEffect, useState } from "react";
import {
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  HeartIcon as HeartOutlineIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { fetchPostsForCircle } from "../../services/postService";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type Post = {
  id: string;
  content: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
};

type Like = {
  post_id: string;
  user_id: string;
};

export default function CircleHome({ circleId }: { circleId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!circleId || !user) return;
    const loadData = async () => {
      setLoading(true);
      const data = await fetchPostsForCircle(circleId);
      setPosts(data);
      const { data: likeData } = await supabase
        .from("likes")
        .select("post_id, user_id")
        .eq("user_id", user.id);
      if (likeData) setLikes(likeData);
      setLoading(false);
    };
    loadData();
  }, [circleId, user]);

  const hasLiked = (postId: string) =>
    likes.some((like) => like.post_id === postId);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const liked = hasLiked(postId);
    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("likes").insert({
        post_id: postId,
        user_id: user.id,
      });
    }
    const { data } = await supabase
      .from("likes")
      .select("post_id, user_id")
      .eq("user_id", user.id);
    if (data) setLikes(data);
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const submitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!user || !content) return;
    await supabase.from("comments").insert({
      post_id: postId,
      profile_id: user.id,
      content,
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Stories section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Stories</h2>
        <div className="flex space-x-4 overflow-x-auto">
          {[...Array(5)].map((_, idx) => (
            <div
              key={idx}
              className="w-16 h-16 rounded-full border-2 border-blue-400 p-1 bg-blue-300 flex-shrink-0"
            />
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading posts...</p>
      ) : posts.length === 0 ? (
        <p>No posts in this circle.</p>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="mb-10 bg-white rounded shadow max-w-xl mx-auto border border-gray-200"
          >
            {/* Header */}
            <div className="flex items-center px-4 py-3">
              <img
                src={
                  post.profiles.avatar_url?.startsWith("http")
                    ? post.profiles.avatar_url
                    : "/default-avatar.png"
                }
                alt={post.profiles.username}
                className="w-10 h-10 rounded-full mr-3 object-cover"
              />
              <span className="font-medium text-sm">{post.profiles.username}</span>
            </div>

            {/* Image */}
            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post"
                className="w-full max-h-[600px] object-cover"
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-between px-4 py-2">
              <div className="flex space-x-4 text-gray-600">
                {hasLiked(post.id) ? (
                  <HeartSolidIcon
                    className="h-6 w-6 cursor-pointer text-red-500"
                    onClick={() => toggleLike(post.id)}
                  />
                ) : (
                  <HeartOutlineIcon
                    className="h-6 w-6 cursor-pointer hover:text-red-500"
                    onClick={() => toggleLike(post.id)}
                  />
                )}
                <ChatBubbleLeftIcon className="h-6 w-6 cursor-pointer hover:text-blue-500" />
                <ShareIcon className="h-6 w-6 cursor-pointer hover:text-green-500" />
              </div>
              <BookmarkIcon className="h-6 w-6 cursor-pointer hover:text-yellow-500" />
            </div>

            {/* Content */}
            <div className="px-4 pb-2 text-sm">
              <p>{post.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>

            {/* Comment input */}
            <div className="px-4 pb-4">
              <input
                type="text"
                placeholder="Write your comment..."
                className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={commentInputs[post.id] || ""}
                onChange={(e) => handleCommentChange(post.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitComment(post.id);
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
