import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';

const CircleSelectionModal = ({ isOpen, onClose, userId }) => {
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const modalRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const fetchCircles = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('circle_members')
        .select('circles(*)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching circles:', error);
      } else {
        setCircles(data.map(item => item.circles));
      }
    };

    if (isOpen) {
      fetchCircles();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    let { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return;
    }

    setImage(filePath);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCircle) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{ circle_id: selectedCircle, user_id: userId, content, image_url: image }]);

      if (error) throw error;
      alert('Post added successfully!');
      onClose();
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white p-6 rounded-lg shadow-lg w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Post to Circle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="circle" className="block text-sm font-medium text-gray-700">Select Circle</label>
            <select
              id="circle"
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Select a Circle</option>
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">Upload Image</label>
            <input
              type="file"
              id="image"
              onChange={handleImageUpload}
              className="mt-1 block w-full"
            />
          </div>
          <button type="submit" className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
            Add Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default CircleSelectionModal;
