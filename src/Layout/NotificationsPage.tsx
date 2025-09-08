import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

interface Notification {
  id: string;
  type: string;
  from_user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  circle_id: string;
  recipient_id: string;
  response_status: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate("/login");
        return;
      }
      setUser(user);
      fetchNotifications(user.id);
    };
    fetchUser();
  }, [navigate]);

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, from_user:from_user(id, username, avatar_url)")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch notifications:", error);
        return;
      }
      setNotifications(data || []);
    } catch (error) {
      console.error("Error in fetchNotifications:", error);
    }
  };

  const handleResponse = async (
  notifId: string,
  accepted: boolean,
  circleId: string,
  profileId: string
) => {
  if (!user?.id) return;

  if (accepted) {
    // Approve: Update the membership status to "active"
    const { error: updateError } = await supabase
      .from("circle_members")
      .update({ status: "active" })
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (updateError) {
      console.error("Error accepting join request:", updateError);
      return;
    }
  } else {
    // Reject: Delete the pending membership record
    const { error: deleteError } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circleId)
      .eq("profile_id", profileId);

    if (deleteError) {
      console.error("Error rejecting join request:", deleteError);
    }
  }

  // Update the notification status
  const { error: notifError } = await supabase
    .from("notifications")
    .update({
      read: true,
      response_status: accepted ? "accepted" : "rejected",
    })
    .eq("id", notifId);

  if (notifError) {
    console.error("Error updating notification status:", notifError);
  }

  // Refresh notifications
  fetchNotifications(user.id);
};


  const markAsRead = async (notifId: string) => {
    await supabase.from("notifications").update({
      read: true,
    }).eq("id", notifId);
    fetchNotifications(user.id);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {notifications.length === 0 && <p>No notifications yet.</p>}
      <ul className="space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`bg-white shadow p-3 rounded ${!n.read ? 'border-l-4 border-blue-500' : ''}`}
            onClick={() => !n.read && markAsRead(n.id)}
          >
            <div className="flex items-start">
              {n.from_user && n.from_user.avatar_url && (
                <img
                  src={n.from_user.avatar_url}
                  alt={n.from_user.username}
                  className="w-10 h-10 rounded-full mr-3"
                />
              )}
              <div className="flex-1">
                {n.type === "like" && (
                  <p><strong>{n.from_user?.username}</strong> liked your post.</p>
                )}
                {n.type === "comment" && (
                  <p><strong>{n.from_user?.username}</strong> commented on your post.</p>
                )}
                {n.type === "invite" && (
                  <>
                    <p><strong>{n.from_user?.username}</strong> invited you to join a circle.</p>
                    {!n.response_status && (
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => handleResponse(n.id, true, n.circle_id, user.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleResponse(n.id, false, n.circle_id, user.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {n.response_status === "accepted" && (
                      <p className="text-green-500 text-sm mt-1">You accepted this invite</p>
                    )}
                    {n.response_status === "rejected" && (
                      <p className="text-red-500 text-sm mt-1">You rejected this invite</p>
                    )}
                  </>
                )}
                {n.type === "join_request" && (
                  <>
                    <p><strong>{n.from_user?.username}</strong> requested to join your circle.</p>
                    {!n.response_status && (
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => handleResponse(n.id, true, n.circle_id, n.from_user.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleResponse(n.id, false, n.circle_id, n.from_user.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {n.response_status === "accepted" && (
                      <p className="text-green-500 text-sm mt-1">You accepted this request</p>
                    )}
                    {n.response_status === "rejected" && (
                      <p className="text-red-500 text-sm mt-1">You rejected this request</p>
                    )}
                  </>
                )}
                {n.type === "accepted" && (
                  <p><strong>{n.from_user?.username}</strong> accepted your circle invite.</p>
                )}
                {n.type === "rejected" && (
                  <p><strong>{n.from_user?.username}</strong> rejected your circle invite.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
