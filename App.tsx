
import React, { useState } from 'react';
import HomePage from './components/HomePage';
import MonitorPage from './components/MonitorPage';

const App: React.FC = () => {
  const [page, setPage] = useState<'home' | 'monitor'>('home');

  const navigateToMonitor = () => setPage('monitor');
  const navigateToHome = () => setPage('home');

  // Render the appropriate page based on the current state.
  // This simple state-based routing avoids the need for a full routing library.
  return page === 'home' 
    ? <HomePage onNavigate={navigateToMonitor} /> 
    : <MonitorPage onNavigateHome={navigateToHome} />;
};

export default App;
