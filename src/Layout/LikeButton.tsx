import { useEffect, useState } from "react";
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import { supabase } from "../services/supabaseClient";
import { ReactElement } from "react";

interface LikeButtonProps {
  postId: string;
  userId: string;
  authorId: string;
}

export default function LikeButton({ postId, userId, authorId }: LikeButtonProps): ReactElement {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const checkLikeStatus = async () => {
      const { data } = await supabase
        .from("likes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      setLiked(!!data);
    };

    checkLikeStatus();
  }, [postId, userId]);

  const toggleLike = async () => {
    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      setLiked(false);
    } else {
      await supabase.from("likes").insert([{ post_id: postId, user_id: userId }]);
      setLiked(true);

      if (userId !== authorId) {
        await supabase.from("notifications").insert([
          {
            type: "like",
            post_id: postId,
            sender_id: userId,
            receiver_id: authorId,
            read: false,
          },
        ]);
      }
    }
  };

  return (
    <button onClick={toggleLike}>
      {liked ? FaHeart({ className: "text-red-500" }) : FaRegHeart({})}
    </button>
  );
}