
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-3 flex items-center justify-between z-10">
      <div className="flex items-center space-x-3">
        <i className="ph-bold ph-satellite text-3xl text-cyan-400"></i>
        <h1 className="text-xl font-bold text-white tracking-wider">ARCTIC POLLUTION MONITOR</h1>
      </div>
      <div className="flex items-center space-x-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm text-green-400 font-semibold">LIVE</span>
      </div>
    </header>
  );
};

export default Header;
