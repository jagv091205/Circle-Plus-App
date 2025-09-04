// src/components/Circle/CreatePost.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { fetchUserCircles } from '../../services/circleService';

type Circle = {
  id: string;
  name: string;
};

export default function CreatePost() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCircles = async () => {
      if (!user) return;
      const data = await fetchUserCircles(user.id);
      setCircles(data);
    };
    loadCircles();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedCircle || !imageFile) return alert('All fields required');
    setLoading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${user.id}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('post-images')
      .upload(filePath, imageFile);

    if (storageError) {
      console.error(storageError.message);
      setLoading(false);
      return;
    }

    const imageUrl = supabase.storage.from('post-images').getPublicUrl(filePath).data.publicUrl;

    // Insert into posts table
    const { error: insertError } = await supabase.from('posts').insert([
      {
        author_id: user.id,
        circle_id: selectedCircle,
        content: caption,
        image_url: imageUrl,
      },
    ]);

    if (insertError) {
      console.error(insertError.message);
    } else {
      alert('Post created successfully!');
      setCaption('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedCircle('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow space-y-4">
      <h2 className="text-xl font-semibold">Post in Circle</h2>
      <select
        value={selectedCircle}
        onChange={(e) => setSelectedCircle(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="">Select a circle</option>
        {circles.map((circle) => (
          <option key={circle.id} value={circle.id}>
            {circle.name}
          </option>
        ))}
      </select>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption..."
        className="w-full border p-2 rounded h-24"
      />
      <input type="file" accept="image/*" onChange={handleImageChange} />
      {/* Image preview */}
      {imagePreview && (
        <div className="mt-2 aspect-square overflow-hidden">
          <img
            src={imagePreview}
            alt="preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Posting...' : 'Post'}
      </button>
    </div>
  );
}
