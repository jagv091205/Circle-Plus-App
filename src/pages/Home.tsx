import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { User } from "@supabase/supabase-js";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import PostModal from "../components/Post/PostModal";
import CircleSettingsModal from "../components/Circle/CircleSettingsModal";
import StoryModal from "../components/Story/StoryModal";
import StoryCreator from "../components/Story/StoryCreator";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { CogIcon } from "@heroicons/react/24/outline";

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  circle_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

type Circle = {
  id: string;
  name: string;
};

type Story = {
  id: string;
  profile_id: string;
  circle_id: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  expires_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  post_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedCircles, setSuggestedCircles] = useState<Circle[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [circleOwnerId, setCircleOwnerId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [stories, setStories] = useState<Story[]>([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [hasUserStory, setHasUserStory] = useState(false);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  const [isMember, setIsMember] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'active' | 'pending' | 'none'>('none');
  const [selectedCircleName, setSelectedCircleName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
      else setUser(data.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (selectedCircleId && user) {
      checkMembership();
    }
  }, [selectedCircleId, user]);

  useEffect(() => {
    if (selectedCircleId) {
      fetchPosts(selectedCircleId);
      fetchStories(selectedCircleId);
    }
  }, [selectedCircleId]);

  useEffect(() => {
    // Run cleanup on component mount
    cleanupExpiredStories();
    // Set up periodic cleanup
    const cleanupInterval = setInterval(cleanupExpiredStories, 60 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (selectedCircleId) {
      fetchCircleName(selectedCircleId);
    }
  }, [selectedCircleId]);

  useEffect(() => {
  if (user) {
    fetchSuggestedCircles();
  }
}, [user, selectedCircleId]);

  const cleanupExpiredStories = async () => {
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

  const fetchCircleName = async (circleId: string) => {
  const { data, error } = await supabase
    .from("circles")
    .select("name")
    .eq("id", circleId)
    .maybeSingle();
  if (error) {
    console.error("Error fetching circle name:", error);
    setSelectedCircleName("Circle not found");
    return;
  }
  if (!data) {
    console.log("Circle not found or no access");
    setSelectedCircleName("Circle not found");
    return;
  }
  setSelectedCircleName(data.name);
};


  const checkMembership = async () => {
  if (!selectedCircleId || !user) return;
  try {
    const { data: circleData, error: circleError } = await supabase
      .from("circles")
      .select("creator_id, is_private")
      .eq("id", selectedCircleId)
      .maybeSingle(); // Change this
    
    if (circleError || !circleData) {
      setMembershipStatus("none");
      setIsMember(false);
      return;
    }

    // Rest of your logic stays the same...
    if (circleData.creator_id === user.id) {
      setMembershipStatus('active');
      setIsMember(true);
      return;
    }
    
    if (circleData.is_private) {
      const { data: membership, error } = await supabase
        .from("circle_members")
        .select("status")
        .eq("circle_id", selectedCircleId)
        .eq("profile_id", user.id)
        .maybeSingle(); // Change this too
      
      if (!error && membership) {
        setMembershipStatus(membership.status);
        setIsMember(membership.status === "active");
      } else {
        setMembershipStatus("none");
        setIsMember(false);
      }
    } else {
      setMembershipStatus('active');
      setIsMember(true);
    }
  } catch (error) {
    console.error("Error checking membership:", error);
    setMembershipStatus("none");
    setIsMember(false);
  }
};


  const requestToJoinCircle = async () => {
    if (!selectedCircleId || !user) return;

    try {
      const { error } = await supabase
        .from("circle_members")
        .insert({
          circle_id: selectedCircleId,
          profile_id: user.id,
          status: "pending",
          role: "member"
        });

      if (error) {
        console.error("Error requesting to join:", error);
        alert("Error requesting to join circle");
      } else {
        alert("Join request sent! Waiting for approval.");
        setMembershipStatus('pending');
      }
    } catch (error) {
      console.error("Error in requestToJoinCircle:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const startConversation = async (userId: string) => {
    navigate(`/messages?startWith=${userId}`);
  };

  const fetchPosts = async (circleId: string) => {
  if (!user) return;

  // Get both is_private and creator_id in one call
  const { data: circleData, error: circleError } = await supabase
    .from("circles")
    .select("is_private, creator_id")
    .eq("id", circleId)
    .maybeSingle();

  if (circleError) {
    console.error("Error fetching circle data:", circleError);
    setPosts([]);
    return;
  }

  // Handle case where circle doesn't exist
  if (!circleData) {
    console.log("Circle not found or no access");
    setPosts([]);
    return;
  }

  // Check access in a single logic flow
  const isOwner = circleData.creator_id === user.id;
  const isPublic = !circleData.is_private;

  if (circleData.is_private && !isOwner) {
    // Check membership only for private circles where user is not owner
    const { data: membership, error: membershipError } = await supabase
      .from("circle_members")
      .select("status")
      .eq("circle_id", circleId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (membershipError || !membership || membership.status !== "active") {
      console.log("User is not an active member of this private circle");
      setPosts([]);
      return;
    }
  }

  // Fetch posts if user has access
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(*)")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });

  if (!error && data) {
    setPosts(data);
    const initialCommentInputs: { [key: string]: string } = {};
    const initialShowComments: { [key: string]: boolean } = {};
    data.forEach(post => {
      initialCommentInputs[post.id] = '';
      initialShowComments[post.id] = false;
    });
    setCommentInputs(initialCommentInputs);
    setShowComments(initialShowComments);
  } else {
    console.error("Error fetching posts:", error);
    setPosts([]);
  }
};


  const fetchStories = async (circleId: string) => {
    const { data, error } = await supabase
      .from("stories")
      .select("*, profiles:profile_id(username, avatar_url)")
      .eq("circle_id", circleId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStories(data);
      setHasUserStory(data.some(story => story.profile_id === user?.id));
    }
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:profile_id (
          username,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(prev => ({
        ...prev,
        [postId]: data
      }));
    } else {
      console.error("Error fetching comments:", error);
    }
  };

  const toggleComments = async (postId: string) => {
    if (!showComments[postId] && !comments[postId]) {
      await fetchComments(postId);
    }
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const addComment = async (postId: string) => {
    if (!commentInputs[postId]?.trim() || !user) return;

    const { data: membership } = await supabase
      .from("circle_members")
      .select("status")
      .eq("circle_id", selectedCircleId)
      .eq("profile_id", user.id)
      .single();

    if (membership?.status !== "active") {
      alert("You need to be an active member to comment");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          content: commentInputs[postId],
          profile_id: user.id,
          post_id: postId
        })
        .select(`
          *,
          profiles:profile_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (!error && data) {
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data]
        }));
        setCommentInputs(prev => ({
          ...prev,
          [postId]: ''
        }));

        const postOwnerId = posts.find(p => p.id === postId)?.author_id;
        if (postOwnerId && postOwnerId !== user.id) {
          const { error: notifError } = await supabase.from("notifications").insert({
            recipient_id: postOwnerId,
            from_user: user.id,
            type: "comment",
            post_id: postId,
            circle_id: selectedCircleId,
            read: false
          });
          if (notifError) console.error("Error inserting notification:", notifError);
        }
      } else {
        console.error("Error adding comment:", error);
      }
    } catch (error) {
      console.error("Error in addComment:", error);
    }
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  const fetchSuggestedCircles = async () => {
  if (!user) return;
  
  try {
    // First get the circles the user is already a member of
    const { data: userCircles, error: userCirclesError } = await supabase
      .from("circle_members")
      .select("circle_id")
      .eq("profile_id", user.id);

    if (userCirclesError) {
      console.error("Error fetching user circles:", userCirclesError);
      return;
    }

    const userCircleIds = userCircles?.map(member => member.circle_id) || [];

    // Get all public circles
    const { data: allCircles, error: circlesError } = await supabase
      .from("circles")
      .select("*")
      .eq("is_private", false);

    if (circlesError) {
      console.error("Error fetching circles:", circlesError);
      return;
    }

    // Filter out circles user is already a member of
    const suggested = allCircles?.filter(circle => 
      !userCircleIds.includes(circle.id)
    ) || [];

    // Also exclude the currently selected circle if it exists
    const filteredSuggested = suggested.filter(circle => 
      circle.id !== selectedCircleId
    );

    setSuggestedCircles(filteredSuggested.slice(0, 5)); // Limit to 5 circles
  } catch (error) {
    console.error("Error in fetchSuggestedCircles:", error);
  }
};

const joinCircle = async (circleId: string) => {
  if (!user) return;

  try {
    const { error } = await supabase
      .from("circle_members")
      .insert({
        circle_id: circleId,
        profile_id: user.id,
        status: "active", // Direct join for public circles
        role: "member"
      });

    if (error) {
      console.error("Error joining circle:", error);
      alert("Error joining circle");
    } else {
      alert("Successfully joined the circle!");
      // Remove the joined circle from suggestions
      setSuggestedCircles(prev => prev.filter(circle => circle.id !== circleId));
    }
  } catch (error) {
    console.error("Error in joinCircle:", error);
    alert("An error occurred. Please try again.");
  }
};

  const sendCircleInvitation = async (circleId: string, invitedUserId: string) => {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) return;

    try {
      const { error } = await supabase.from("notifications").insert({
        recipient_id: invitedUserId,
        from_user: currentUser.id,
        type: "invite",
        circle_id: circleId,
        response_status: "pending",
        read: false
      });
      if (error) console.error("Error sending invitation:", error);
    } catch (error) {
      console.error("Error in sendCircleInvitation:", error);
    }
  };

  const refetchPosts = () => {
    if (selectedCircleId) {
      fetchPosts(selectedCircleId);
    }
  };

  const refetchStories = () => {
    if (selectedCircleId) {
      fetchStories(selectedCircleId);
    }
  };

  const handleStoryClick = (index: number) => {
    setCurrentStoryIndex(index);
    setShowStoryModal(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prevLikedPosts) => {
      const newLikedPosts = new Set(prevLikedPosts);
      if (newLikedPosts.has(postId)) {
        newLikedPosts.delete(postId);
      } else {
        newLikedPosts.add(postId);
      }
      return newLikedPosts;
    });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        onLogout={handleLogout}
        user={user}
        onPostClick={() => setShowPostModal(true)}
      />
      <div className="flex flex-1">
        <Sidebar onCircleSelect={setSelectedCircleId} />
        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          {!selectedCircleId ? (
            <p className="text-gray-500 text-center mt-10">
              Select a circle to see posts
            </p>
          ) : membershipStatus === 'pending' ? (
            <div className="text-center mt-10">
              <p className="text-gray-500 mb-4">Your membership is pending approval</p>
              <p className="text-sm text-gray-400">
                Wait for the circle admin to approve your request
              </p>
            </div>
          ) : membershipStatus === 'none' ? (
            <div className="text-center mt-10">
              <p className="text-gray-500 mb-4">You are not a member of this circle</p>
              <button
                onClick={requestToJoinCircle}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Request to Join
              </button>
            </div>
          ) : (
            <div className="flex">
              <div className="w-2/3 space-y-6">
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-md font-semibold mb-3">Stories</h2>
                  <div className="flex space-x-4 overflow-x-auto">
                    <StoryCreator
                      circleId={selectedCircleId}
                      userId={user.id}
                      userAvatar={user.user_metadata?.avatar_url}
                      onStoryCreated={refetchStories}
                    />
                    {stories.map((story, index) => (
                      <div
                        key={story.id}
                        className="flex-shrink-0 relative cursor-pointer"
                        onClick={() => handleStoryClick(index)}
                      >
                        <div className={`w-16 h-16 rounded-full p-[2px] ${
                          story.profile_id === user.id
                            ? 'bg-gradient-to-tr from-yellow-400 to-pink-600'
                            : 'bg-gradient-to-tr from-purple-400 to-blue-600'
                        }`}>
                          <img
                            src={story.profiles.avatar_url || "/default-avatar.png"}
                            alt={story.profiles.username}
                            className="w-full h-full rounded-full object-cover border-2 border-white"
                          />
                        </div>
                        <p className="text-xs text-center mt-1 truncate w-16">
                          {story.profile_id === user.id ? "Your Story" : story.profiles.username}
                        </p>
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          ⌛
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end mb-4 space-x-2">
                  <button
                    onClick={() => navigate(`/circle/${selectedCircleId}/messages`)}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    💬 Circle Chat
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    <CogIcon className="h-5 w-5 mr-2" />
                    Circle Settings
                  </button>
                </div>
                {posts.length === 0 ? (
                  <p className="text-gray-500">No posts in this circle yet.</p>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden max-w-md mx-auto">
                      <div className="flex items-center p-4">
                        <img
                          src={post.profiles.avatar_url || "/default-avatar.png"}
                          alt={post.profiles.username}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <span className="font-medium text-sm">{post.profiles.username}</span>
                          <button
                            onClick={() => startConversation(post.author_id)}
                            className="ml-2 text-blue-500 text-xs hover:underline"
                          >
                            Message
                          </button>
                        </div>
                      </div>
                      {post.image_url && (
                        <div className="w-full">
                          <img
                            src={post.image_url}
                            alt="Post content"
                            className="w-full object-cover"
                            style={{ height: "400px" }}
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center">
                          <button onClick={() => toggleLike(post.id)} className="mr-2">
                            {likedPosts.has(post.id) ? (
                              <HeartSolidIcon className="h-6 w-6 text-red-500" />
                            ) : (
                              <HeartOutlineIcon className="h-6 w-6" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleComments(post.id)}
                            className="text-gray-500 text-sm"
                          >
                            {showComments[post.id] ? 'Hide Comments' : 'Show Comments'}
                          </button>
                        </div>
                        <p className="mt-2 text-gray-800">{post.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Posted on {new Date(post.created_at).toLocaleString()}
                        </p>
                        {showComments[post.id] && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="font-medium mb-2">Comments:</h4>
                            {comments[post.id]?.length > 0 ? (
                              comments[post.id].map(comment => (
                                <div key={comment.id} className="mb-2 p-2 bg-gray-50 rounded">
                                  <div className="flex items-center mb-1">
                                    <img
                                      src={comment.profiles.avatar_url || "/default-avatar.png"}
                                      alt={comment.profiles.username}
                                      className="w-6 h-6 rounded-full mr-2"
                                    />
                                    <div>
                                      <span className="font-medium text-sm">{comment.profiles.username}</span>
                                      <button
                                        onClick={() => startConversation(comment.author_id)}
                                        className="ml-2 text-blue-500 text-xs hover:underline"
                                      >
                                        Message
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm">{comment.content}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No comments yet.</p>
                            )}
                          </div>
                        )}
                        <div className="mt-4 flex">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-l-lg"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => addComment(post.id)}
                            className="bg-blue-500 text-white px-4 rounded-r-lg"
                            disabled={!commentInputs[post.id]?.trim()}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
<div className="w-1/3 p-4 bg-white rounded-lg shadow-md ml-6 h-fit max-h-96 overflow-y-auto">
  <h2 className="text-lg font-semibold mb-4">Suggested Circles</h2>
  {suggestedCircles.length === 0 ? (
    <p className="text-gray-500 text-sm">No suggested circles available. You might already be a member of all public circles.</p>
  ) : (
    suggestedCircles.map((circle) => (
      <div key={circle.id} className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-300 mr-3 flex-shrink-0"></div>
          <span className="font-medium text-sm">{circle.name}</span>
        </div>
        <button 
          onClick={() => joinCircle(circle.id)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          Join
        </button>
      </div>
    ))
  )}
</div>
            </div>
          )}
        </main>
      </div>
      {showPostModal && (
        <PostModal
          onClose={() => setShowPostModal(false)}
          selectedCircleId={selectedCircleId}
          onPostCreated={refetchPosts}
        />
      )}
      {showSettings && (
        <CircleSettingsModal
          circleId={selectedCircleId}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showStoryModal && (
        <StoryModal
          circleId={selectedCircleId}
          userId={user.id}
          onClose={() => setShowStoryModal(false)}
          onStoryDeleted={refetchStories}
          onStoryUpdated={refetchStories}
          initialStoryIndex={currentStoryIndex}
        />
      )}
    </div>
  );
};

export default Home;