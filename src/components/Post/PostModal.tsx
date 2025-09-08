import { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type Circle = {
  id: string;
  name: string;
};

type PostModalProps = {
  onClose: () => void;
  selectedCircleId: string;
  onPostCreated: () => void;
};

export default function PostModal({ onClose, selectedCircleId, onPostCreated }: PostModalProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string>(selectedCircleId);

  useEffect(() => {
    const fetchCircles = async () => {
      const { data, error } = await supabase
        .from("circle_members")
        .select("circle_id, circles(name)")
        .eq("profile_id", user?.id);

      if (error) {
        console.error("Error fetching circles:", error.message);
        return;
      }

      const formatted: Circle[] =
        data?.map((item: any) => ({
          id: item.circle_id,
          name: item.circles?.name || "Unnamed Circle",
        })) || [];

      setCircles(formatted);
    };

    if (user?.id) fetchCircles();
  }, [user]);

  const handleUpload = async () => {
    console.log("Current user ID:", user?.id);
    if (!user || !imageFile || !selectedCircle) {
      alert("All fields are required");
      return;
    }

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${imageFile.name}`;
    const filePath = `posts/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      alert("Image upload failed");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from("posts").insert([
      {
        author_id: user.id,
        circle_id: selectedCircle,
        content: caption,
        image_url: publicUrl,
      },
    ]);

    if (insertError) {
      console.error("Post insert error:", insertError.message);
      alert("Post creation failed");
    } else {
      onPostCreated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Create a Post</h2>
        <label className="block text-sm font-medium mb-1">Select Circle:</label>
        <select
          value={selectedCircle}
          onChange={(e) => setSelectedCircle(e.target.value)}
          className="w-full mb-4 border p-2 rounded"
        >
          <option value="">-- Select --</option>
          {circles.map((circle) => (
            <option key={circle.id} value={circle.id}>
              {circle.name}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium mb-1">Caption:</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
        />
        <label className="block text-sm font-medium mb-1">Upload Image:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
