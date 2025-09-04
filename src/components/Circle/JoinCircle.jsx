// src/components/Circle/JoinCircle.jsx
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';

const JoinCircle = ({ userId }) => {
  const [circleId, setCircleId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('circle_members')
        .insert([{ circle_id: circleId, user_id: userId }])
        .select();

      if (error) throw error;
      alert('Joined circle successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="circleId" className="block text-sm font-medium text-gray-700">Circle ID</label>
        <input
          type="text"
          id="circleId"
          value={circleId}
          onChange={(e) => setCircleId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <button type="submit" className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
        Join Circle
      </button>
    </form>
  );
};

export default JoinCircle;
