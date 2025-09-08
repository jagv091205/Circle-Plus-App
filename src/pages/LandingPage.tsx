import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Shield, MessageCircle } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#131723] text-white overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-800/50 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-2xl font-bold tracking-wide">Circles+</span>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <button
            onClick={() => navigate("/login")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 px-5 py-2 rounded-xl font-medium transition-all"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center justify-between px-8 py-20 max-w-7xl mx-auto">
        {/* Left Content */}
        <div className="flex-1 max-w-xl mb-12 lg:mb-0">
          <h1 className="text-6xl lg:text-7xl font-extrabold mb-8 leading-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Circles+
          </h1>

          <p className="text-gray-400 text-lg mb-4">
            Not everyone needs to see everything. Post in the right circle.
          </p>
          <p className="text-gray-400 text-lg mb-4">
            Create private, cozy spaces for your real-life social groups.
          </p>
          <p className="text-gray-400 text-lg mb-10">
            Share photos, videos, and thoughts without the pressure of public
            feeds.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate("/login")}
              className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Explore Public Circles
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="w-full max-w-[600px] h-[400px] flex items-center justify-center">
          <img
            src="/homeImage.png"
            alt="Home"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="px-8 py-20 bg-gradient-to-b from-[#131723] to-[#181b2e]">
        <div className="text-center mb-16">
          <p className="text-purple-400 text-sm uppercase tracking-widest mb-3">
            Key Features
          </p>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
            Why Choose Circles+?
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Circle+ organizes your life into clean social spaces where you're
            free to post without judgment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto mb-16">
          {[
            {
              icon: <Users className="w-7 h-7 text-purple-400" />,
              title: "Multiple Circles",
              text: "Create distinct circles for friends, family, work, hobbies, and more. Keep conversations relevant and private.",
            },
            {
              icon: <Shield className="w-7 h-7 text-purple-400" />,
              title: "Privacy First",
              text: "No public profiles by default. Content stays within its designated circle. Optional anonymous posting for honest talks.",
            },
            {
              icon: <MessageCircle className="w-7 h-7 text-purple-400" />,
              title: "Real Connections",
              text: "Focus on genuine interactions without follower counts or like pressure. Each post can become a meaningful threaded discussion.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-gray-900/60 p-10 rounded-2xl hover:bg-gray-800/60 transition-all border border-gray-800/50"
            >
              <div className="w-14 h-14 bg-purple-600/20 rounded-full flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Public Circles Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
            Discover Public Circles
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Explore communities open to everyone. Find like-minded individuals
            and engage in public discussions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {[
            {
              name: "Tech Talk",
              desc: "Discussions about the latest in technology.",
              members: "120 members",
              initial: "T",
            },
            {
              name: "Book Lovers",
              desc: "Share your favorite reads and reviews.",
              members: "85 members",
              initial: "B",
            },
            {
              name: "Fitness Fanatics",
              desc: "Workout tips, progress sharing, and motivation.",
              members: "200 members",
              initial: "F",
            },
          ].map((circle, idx) => (
            <div
              key={idx}
              className="bg-gray-900/60 p-8 rounded-2xl hover:bg-gray-800/60 transition-all border border-gray-800/50"
            >
              <div className="flex items-center mb-5">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mr-3 font-semibold text-lg">
                  {circle.initial}
                </div>
                <h3 className="text-lg font-semibold">{circle.name}</h3>
              </div>
              <p className="text-gray-400 mb-6">{circle.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {circle.members}
                </span>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  View Circle
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 px-10 py-4 rounded-xl font-semibold text-lg transition-all"
          >
            Explore More Public Circles
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-8 py-6 mt-16 text-center text-sm text-gray-500">
        © Circles+. All rights reserved.
      </footer>
    </div>
  );
}
