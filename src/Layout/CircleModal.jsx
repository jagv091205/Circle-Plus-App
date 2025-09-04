// src/components/Layout/CircleModal.jsx
import React, { useState } from 'react';
import CircleSelectionModal from '../components/Circle/CircleSelectionModal';

const CircleModal = ({ isOpen, onClose, userId }) => {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-20">
      <button
        onClick={() => setIsSelectionModalOpen(true)}
        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
      >
        Add Post to Existing Circle
      </button>
      <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
        Create New Circle
      </button>
      <CircleSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        userId={userId}
      />
    </div>
  );
};

export default CircleModal;
