// src/pages/CirclesPage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import CreateCircle from '../components/Circle/CreateCircle';
import JoinCircle from '../components/Circle/JoinCircle';

const CirclesPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Circles</h1>
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Create a New Circle</h2>
          <CreateCircle userId={user?.id} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Join a Circle</h2>
          <JoinCircle userId={user?.id} />
        </div>
      </div>
    </div>
  );
};

export default CirclesPage;
