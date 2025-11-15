
import React from 'react';

interface HomePageProps {
  onNavigate: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-gray-900 text-gray-200 h-screen w-screen flex flex-col items-center justify-center p-4 font-sans text-center relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{backgroundImage: "url('https://images.unsplash.com/photo-1549144511-85b3f20f8b22?q=80&w=1920&auto=format&fit=crop')"}}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900 to-gray-900"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <i className="ph-bold ph-planet text-7xl md:text-8xl text-cyan-400 mb-4 animate-pulse"></i>
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wider mb-4">
          Монитор Загрязнения Арктики
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-8">
          Проект для мониторинга экологической обстановки в Арктике с использованием симулированных спутниковых данных и анализа с помощью ИИ.
        </p>
        <button
          onClick={onNavigate}
          className="px-8 py-4 bg-cyan-600 text-white font-bold text-lg rounded-md hover:bg-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
        >
          <i className="ph-bold ph-satellite"></i>
          <span>Перейти к мониторингу</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
