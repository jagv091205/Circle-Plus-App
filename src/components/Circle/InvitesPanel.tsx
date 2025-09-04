// src/components/Circle/InvitesPanel.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

interface InvitesPanelProps {
  userId: string;
}

interface Invite {
  id: string;
  circle_id: string;
  circles: {
    name: string;
  }[];
}

export default function InvitesPanel({ userId }: InvitesPanelProps) {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from("circle_members")
        .select("circle_id, id, circles(name)")
        .eq("profile_id", userId)
        .eq("status", "pending");

      if (!error && data) {
        setInvites(data);
      }
    };

    fetchInvites();
  }, [userId]);

  const handleAccept = async (id: string) => {
    await supabase.from("circle_members").update({ status: "active" }).eq("id", id);
    setInvites((prev) => prev.filter((invite) => invite.id !== id));
  };

  const handleReject = async (id: string) => {
    await supabase.from("circle_members").delete().eq("id", id);
    setInvites((prev) => prev.filter((invite) => invite.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-3">Circle Invites</h2>
      {invites.length === 0 ? (
        <p className="text-gray-500">No invites.</p>
      ) : (
        <ul className="space-y-3">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex justify-between items-center p-3 bg-gray-100 rounded"
            >
              <span>{invite.circles[0]?.name}</span>
              <div className="space-x-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                  onClick={() => handleAccept(invite.id)}
                >
                  Accept
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleReject(invite.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
