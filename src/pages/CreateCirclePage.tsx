// src/pages/CreateCirclePage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import Navbar from "../Layout/Navbar";

const CreateCirclePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_private: false
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/login");
        return;
      }

      const { error } = await supabase
        .from("circles")
        .insert({
          name: formData.name,
          description: formData.description,
          is_private: formData.is_private,
          creator_id: user.id
        });

      if (error) throw error;

      navigate("/");
    } catch (error) {
      console.error("Error creating circle:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Navbar
        user={null}
        onLogout={() => {}}
        onPostClick={() => {}}
      />

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Circle</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Circle Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleInputChange}
              className="mr-2"
              id="is_private"
            />
            <label htmlFor="is_private">Private Circle</label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isCreating ? "Creating..." : "Create Circle"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateCirclePage;
