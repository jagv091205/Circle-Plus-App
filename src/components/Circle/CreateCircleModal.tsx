// import { useState } from "react";
// import { supabase } from "../../services/supabaseClient";
// import { useAuth } from "../../context/AuthContext";

// export default function CreateCircleModal({ onClose }: { onClose: () => void }) {
//   const { user } = useAuth();
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [isPrivate, setIsPrivate] = useState(false);
//   const [inviteInput, setInviteInput] = useState("");
//   const [invitees, setInvitees] = useState<string[]>([]);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleAddInvitee = () => {
//     const trimmed = inviteInput.trim();
//     if (trimmed && !invitees.includes(trimmed)) {
//       setInvitees([...invitees, trimmed]);
//     }
//     setInviteInput("");
//   };

//   const handleRemoveInvitee = (emailOrUsername: string) => {
//     setInvitees(invitees.filter((v) => v !== emailOrUsername));
//   };

//   const handleCreate = async () => {
//     if (!name || !user) return;
//     setError("");
//     setLoading(true);

//     // Step 1: Create the circle
//     const { data: circle, error: err1 } = await supabase
//       .from("circles")
//       .insert([
//         {
//           name,
//           description,
//           is_private: isPrivate,
//           created_id: user.id,
//         },
//       ])
//       .select()
//       .single();

//     if (err1 || !circle) {
//       console.error("Create circle error:", err1);
//       setError("Failed to create circle.");
//       setLoading(false);
//       return;
//     }

//     // Step 2: Add creator as member
//     await supabase.from("circle_members").insert({
//       circle_id: circle.id,
//       profile_id: user.id,
//       role: "owner",
//       status: "accepted",
//       is_admin: true,
//     });

//     // Step 3: Resolve invitees
//     if (invitees.length > 0) {
//       // Fetch users whose username OR email matches any of the invitees
//       const { data: users, error: userFetchError } = await supabase
//         .from("profiles")
//         .select("id, email, username");

//       if (userFetchError) {
//         console.error("User lookup error:", userFetchError);
//       }

//       for (const invitee of invitees) {
//         const target = users?.find(
//           (u) => u.email === invitee || u.username === invitee
//         );

//         if (target) {
//           // Add to circle_members with pending status
//           await supabase.from("circle_members").insert({
//             circle_id: circle.id,
//             profile_id: target.id,
//             role: "member",
//             status: "pending",
//             is_admin: false,
//           });

//           // Send invitation notification
//           await supabase.from("notifications").insert({
//             recipient_id: target.id,
//             from_user: user.id,
//             post_id: circle.id,
//             type: "invite",
//           });
//         }
//       }
//     }

//     setLoading(false);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="p-6 bg-white rounded shadow max-w-md w-full">
//         <h2 className="text-xl font-bold mb-4">Create Circle</h2>
//         {error && <p className="text-red-500 mb-2">{error}</p>}

//         <input
//           type="text"
//           className="w-full mb-3 border p-2 rounded"
//           placeholder="Circle Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//         />
//         <textarea
//           className="w-full mb-3 border p-2 rounded"
//           placeholder="Description (optional)"
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//         />

//         <label className="mb-4 block">
//           <input
//             type="checkbox"
//             checked={isPrivate}
//             onChange={(e) => setIsPrivate(e.target.checked)}
//             className="mr-2"
//           />
//           Make this circle private
//         </label>

//         <div className="flex items-center gap-2 mb-2">
//           <input
//             type="text"
//             className="flex-1 border p-2 rounded"
//             placeholder="Username or email"
//             value={inviteInput}
//             onChange={(e) => setInviteInput(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && handleAddInvitee()}
//           />
//           <button
//             onClick={handleAddInvitee}
//             className="px-3 py-1 bg-blue-500 text-white rounded"
//           >
//             Add
//           </button>
//         </div>

//         {invitees.length > 0 && (
//           <div className="mb-4">
//             <h4 className="font-semibold mb-1">Invitees:</h4>
//             <ul className="space-y-1">
//               {invitees.map((v) => (
//                 <li
//                   key={v}
//                   className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded"
//                 >
//                   <span>{v}</span>
//                   <button
//                     onClick={() => handleRemoveInvitee(v)}
//                     className="text-red-500 text-sm"
//                   >
//                     Remove
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <div className="flex justify-end gap-2">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleCreate}
//             disabled={loading}
//             className={`px-4 py-2 rounded text-white ${
//               loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
//             }`}
//           >
//             {loading ? "Creating..." : "Create"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function CreateCircleModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddInvitee = () => {
    const trimmed = inviteInput.trim();
    if (trimmed && !invitees.includes(trimmed)) {
      setInvitees([...invitees, trimmed]);
    }
    setInviteInput("");
  };

  const handleRemoveInvitee = (v: string) => {
    setInvitees(invitees.filter((i) => i !== v));
  };

  const handleCreate = async () => {
    if (!name || !user) return;
    setError("");
    setLoading(true);

    // create circle
    const { data: circle, error: err1 } = await supabase
      .from("circles")
      .insert([{ name, description, is_private: isPrivate, creator_id: user.id }])
      .select()
      .single();

    if (err1 || !circle) {
      console.error("Create error:", err1);
      setError("Failed to create circle");
      setLoading(false);
      return;
    }

    // add owner
    await supabase.from("circle_members").insert({
      circle_id: circle.id,
      profile_id: user.id,
      role: "owner",
      status: "accepted",
      is_admin: true,
    });

    // invite others
    if (invitees.length) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, email, username")
        .in("email", invitees)
        .or(invitees.map((v) => `username.eq.${v}`).join(","));

      for (const v of invitees) {
        const target = users?.find((u) => u.email === v || u.username === v);
        if (target) {
          await supabase.from("circle_members").insert({
            circle_id: circle.id,
            profile_id: target.id,
            role: "member",
            status: "pending",
            is_admin: false,
          });
          await supabase.from("notifications").insert({
            recipient_id: target.id,
            from_user: user.id,
            circle_id: circle.id,
            type: "invite",
          });
        }
      }
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create Circle</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Circle Name"
          className="w-full mb-3 border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          className="w-full mb-3 border p-2 rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="block mb-3">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mr-2"
          />
          Make this circle private
        </label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Username or email to invite"
            className="flex-1 border p-2 rounded"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddInvitee()}
          />
          <button onClick={handleAddInvitee} className="px-3 py-1 bg-blue-500 text-white rounded">
            Add
          </button>
        </div>
        {invitees.length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold">Invitees:</h4>
            <ul className="space-y-1">
              {invitees.map((v) => (
                <li key={v} className="flex justify-between bg-gray-100 p-2 rounded">
                  <span>{v}</span>
                  <button onClick={() => handleRemoveInvitee(v)} className="text-red-500 text-sm">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`px-4 py-2 text-white rounded ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
