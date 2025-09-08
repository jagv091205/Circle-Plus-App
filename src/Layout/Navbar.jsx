import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaUserCircle, FaBell, FaSearch } from "react-icons/fa";
import { supabase } from "../services/supabaseClient";
import CreateCircleModal from "../components/Circle/CreateCircleModal";

export default function Navbar({ user, onLogout, onPostClick }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
  const [unread, setUnread] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    // Fetch user profile data
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setProfileData(data);
      }
    };
    
    fetchProfile();
    
    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("receiver_id", user.id)
        .eq("read", false);
      if (!error && data.length > 0) {
        setUnread(true);
      }
    };
    fetchUnread();
    
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.new.receiver_id === user.id) {
            setUnread(true);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }
    const { data, error } = await supabase
      .from("circles")
      .select("*")
      .ilike("name", `%${searchQuery}%`)
      .eq("is_private", false)
      .neq("creator_id", user.id);
    if (!error && data) {
      setSearchResults(data);
      setShowSearchResults(true);
    } else {
      console.error("Error searching circles:", error);
    }
  };

  const sendJoinRequest = async (circleId) => {
    try {
      // Check if circle is public
      const { data: circleData, error: circleError } = await supabase
        .from("circles")
        .select("is_private, creator_id")
        .eq("id", circleId)
        .single();

      if (circleError) throw circleError;

      let status = "pending";
      // If circle is public, join directly
      if (!circleData.is_private) {
        status = "active";
      }

      const { error } = await supabase.from("circle_members").insert({
        circle_id: circleId,
        profile_id: user.id,
        status: status,
      });

      if (error) throw error;

      // Only send notification for private circles
      if (circleData.is_private) {
        const { error: notifError } = await supabase.from("notifications").insert({
          recipient_id: circleData.creator_id,
          from_user: user.id,
          type: "join_request",
          circle_id: circleId,
          response_status: "pending",
          read: false,
        });
        if (notifError) throw notifError;
      }

      alert(circleData.is_private ? "Join request sent!" : "Successfully joined the circle!");
      setShowSearchResults(false);
      setSearchQuery("");

    } catch (error) {
      console.error("Error sending join request:", error);
      alert("Failed to send join request.");
    }
  };

  return (
    <>
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-md">
        <div
          className="text-2xl font-bold text-blue-600 cursor-pointer"
          onClick={() => navigate("/home")}
        >
          Circle
        </div>
        <div className="flex-1 mx-8 relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search public circles"
              className="w-full px-4 py-2 pl-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </form>
          {showSearchResults && (
            <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="p-4 text-gray-500">No public circles found.</p>
              ) : (
                <ul>
                  {searchResults.map((circle) => (
                    <li
                      key={circle.id}
                      className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-300 mr-3 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-sm">{circle.name}</p>
                          <p className="text-xs text-gray-500">Public Circle</p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendJoinRequest(circle.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        Join
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4 relative">
          <div className="relative">
            <FaPlus
              size={20}
              className="cursor-pointer text-gray-600"
              onClick={() => setShowCreateMenu(!showCreateMenu)}
            />
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded border z-50">
                <button
                  className="block w-full px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    setShowCreateCircleModal(true);
                    setShowCreateMenu(false);
                  }}
                >
                  Create Circle
                </button>
                <button
                  className="block w-full px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    onPostClick();
                    setShowCreateMenu(false);
                  }}
                >
                  Post in Circle
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <FaBell
              size={22}
              className="cursor-pointer text-gray-600"
              onClick={() => {
                navigate("/notifications");
                setUnread(false);
              }}
            />
            {unread && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </div>
          <div className="relative">
            {profileData?.avatar_url ? (
              <img
                src={profileData.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full cursor-pointer object-cover"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              />
            ) : (
              <FaUserCircle
                size={28}
                className="cursor-pointer text-gray-600"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              />
            )}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded border z-50">
                <div className="px-4 py-2 text-sm text-gray-700">
                  {profileData?.username || user?.email}
                </div>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfileMenu(false);
                  }}
                  className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowProfileMenu(false);
                  }}
                  className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                >
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="block w-full px-4 py-2 text-red-500 hover:bg-gray-100 text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {showCreateCircleModal && (
        <CreateCircleModal
          user={user}
          onClose={() => setShowCreateCircleModal(false)}
        />
      )}
    </>
  );
}