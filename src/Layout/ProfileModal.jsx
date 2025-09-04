// src/components/Layout/ProfileModal.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileModal = ({ isOpen, onClose }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-20">
      <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
        Settings
      </button>
      <button
        onClick={handleSignOut}
        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
      >
        Sign Out
      </button>
    </div>
  );
};

export default ProfileModal;
