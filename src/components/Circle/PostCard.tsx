// src/components/Post/PostCard.tsx
import React, { useState, useEffect } from "react";
import {
  ShareIcon,
  BookmarkIcon,
  HeartIcon as HeartOutlineIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { supabase } from "../../services/supabaseClient";

type Profile = {
  username: string;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: Profile;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: Profile;
  circle_id: string;
};

type PostCardProps = {
  post: Post;
  hasLiked: boolean;
  toggleLike: (postId: string) => void;
  currentUserId: string;
  currentUserProfile: Profile;
};

const PostCard: React.FC<PostCardProps> = ({
  post,
  hasLiked,
  toggleLike,
  currentUserId,
  currentUserProfile
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Fetch comments for this post
  useEffect(() => {
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:profile_id (
          username, 
          avatar_url
        )
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setComments(data);
    } else {
      console.error("Error fetching comments:", error);
    }
  };
  fetchComments();
}, [post.id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newComment.trim() || !currentUserId) return;
  
  setIsPosting(true);
  try {
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: post.id,
          profile_id: currentUserId, // Use profile_id instead of author_id
          content: newComment
        }
      ])
      .select(`
        *,
        profiles:profile_id (
          username,
          avatar_url
        )
      `)
      .single();

    if (!error && data) {
      setComments([data, ...comments]);
      setNewComment("");
      
      // Create notification for post owner if it's not the current user
      if (post.profiles.username !== currentUserProfile.username) {
        // Find the post owner's profile ID
        const { data: postOwner, error: ownerError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", post.profiles.username)
          .single();
        
        if (!ownerError && postOwner) {
          await supabase.from("notifications").insert({
            recipient_id: postOwner.id,
            from_user: currentUserId,
            type: "comment",
            post_id: post.id,
            circle_id: post.circle_id,
            read: false
          });
        }
      }
    } else {
      console.error("Error posting comment:", error);
    }
  } catch (error) {
    console.error("Error posting comment:", error);
  } finally {
    setIsPosting(false);
  }
};

  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <div className="mb-10 bg-white rounded shadow max-w-xl mx-auto border border-gray-200">
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
        <div className="w-full overflow-hidden flex justify-center p-4">
          <img
            src={post.image_url}
            alt="Post"
            className="object-cover w-full max-h-96"
            style={{ maxWidth: '400px', maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between px-4 py-2">
        <div className="flex space-x-4 text-gray-600">
          {hasLiked ? (
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

      {/* Comments Section */}
      <div className="px-4 pb-4">
        {comments.length > 0 && (
          <>
            {displayedComments.length > 0 && (
              <div className="mb-2">
                {displayedComments.map((comment) => (
                  <div key={comment.id} className="mb-2 flex items-start">
                    <img
                      src={
                        comment.profiles.avatar_url?.startsWith("http")
                          ? comment.profiles.avatar_url
                          : "/default-avatar.png"
                      }
                      alt={comment.profiles.username}
                      className="w-8 h-8 rounded-full mr-2 object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-sm mr-2">
                          {comment.profiles.username}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comments.length > 2 && !showAllComments && (
              <button
                onClick={() => setShowAllComments(true)}
                className="text-sm text-gray-500 mb-2"
              >
                View all {comments.length} comments
              </button>
            )}
          </>
        )}

        {/* Add a comment form */}
        <form onSubmit={handleCommentSubmit} className="mt-2">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isPosting}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-2 rounded-r hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isPosting || !newComment.trim()}
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostCard;
