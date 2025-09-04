import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, MessageCircle } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-semibold">Circles+</span>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-400">Public Circles</span>
          <button className="text-gray-300 hover:text-white">🔍</button>
          <button
            onClick={() => navigate("/login")}
            className="text-gray-300 hover:text-white"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Sign Up
          </button>
        </div>
      </header>
      <div className="flex">
        {/* Left Content */}
        <div className="flex-1 px-6 py-20">
          <div className="max-w-xl">
            <h1 className="text-6xl font-bold mb-8 leading-tight">
              Circles+
            </h1>

            <p className="text-gray-400 text-lg mb-2">
              Not everyone needs to see everything. Post in the right circle.
            </p>
            <p className="text-gray-400 text-lg mb-4">
              Create private, cozy spaces for your real-life social groups.
            </p>
            <p className="text-gray-400 text-lg mb-8">
              Share photos, videos, and thoughts without the pressure of public feeds.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate("/signup")}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="border border-gray-600 hover:border-gray-500 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explore Public Circles
              </button>
            </div>
          </div>
        </div>
        {/* Right Placeholder */}
        <div className="w-96 flex items-center justify-center bg-gray-800 m-6 rounded-lg">
          <div className="text-gray-500 text-6xl font-light">
            600 × 400
          </div>
        </div>
      </div>
      {/* Features Section */}
      <div className="px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-purple-400 text-sm uppercase tracking-wider mb-4">Key Features</p>
          <h2 className="text-4xl font-bold mb-6">Why Choose Circles+?</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Circle+ organizes your life into clean social spaces where you're free to post without judgment.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <div className="bg-gray-800 p-8 rounded-xl">
            <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Multiple Circles</h3>
            <p className="text-gray-400 leading-relaxed">
              Create distinct circles for friends, family, work, hobbies, and more. Keep conversations relevant and private.
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-xl">
            <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Privacy First</h3>
            <p className="text-gray-400 leading-relaxed">
              No public profiles by default. Content stays within its designated circle. Optional anonymous posting for honest talks.
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-xl">
            <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Real Connections</h3>
            <p className="text-gray-400 leading-relaxed">
              Focus on genuine interactions without follower counts or like pressure. Each post can become a meaningful threaded discussion.
            </p>
          </div>
        </div>
        {/* Public Circles Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6">Discover Public Circles</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Explore communities open to everyone. Find like-minded individuals and engage in public discussions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-300 font-semibold">T</span>
              </div>
              <h3 className="text-lg font-semibold">Tech Talk</h3>
            </div>
            <p className="text-gray-400 mb-4">Discussions about the latest in technology.</p>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm flex items-center">
                <Users className="w-4 h-4 mr-1" />
                120 members
              </span>
              <button
                onClick={() => navigate("/login")}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                View Circle
              </button>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-300 font-semibold">B</span>
              </div>
              <h3 className="text-lg font-semibold">Book Lovers</h3>
            </div>
            <p className="text-gray-400 mb-4">Share your favorite reads and reviews.</p>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm flex items-center">
                <Users className="w-4 h-4 mr-1" />
                85 members
              </span>
              <button
                onClick={() => navigate("/login")}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                View Circle
              </button>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-300 font-semibold">F</span>
              </div>
              <h3 className="text-lg font-semibold">Fitness Fanatics</h3>
            </div>
            <p className="text-gray-400 mb-4">Workout tips, progress sharing, and motivation.</p>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm flex items-center">
                <span className="mr-1">👥</span>
                200 members
              </span>
              <button
                onClick={() => navigate("/login")}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                View Circle
              </button>
            </div>
          </div>
        </div>
        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Explore More Public Circles
          </button>
        </div>
      </div>
      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>© Circles+. All rights reserved.</span>
          <span className="flex items-center">
            <span className="mr-2">N</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
