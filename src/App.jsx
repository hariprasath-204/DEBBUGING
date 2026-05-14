import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import EditorPage from './components/EditorPage';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import WaitingPage from './components/WaitingPage';
import TimerFinishedPage from './components/TimerFinishedPage';
import ThankYouPage from './components/ThankYouPage';
import QuestionSelectionPage from './components/QuestionSelectionPage';

function App() {
  return (
    <Router>
      <div className="particles"></div>
      <div className="app-container" style={{ minHeight: '100vh', padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/waiting" element={<WaitingPage />} />
          <Route path="/selection" element={<QuestionSelectionPage />} />
          <Route path="/editor/:questionId" element={<EditorPage />} />
          <Route path="/timer-finished" element={<TimerFinishedPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
