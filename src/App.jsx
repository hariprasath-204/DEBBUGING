import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import EditorPage from './components/EditorPage';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import WaitingPage from './components/WaitingPage';
import TimerFinishedPage from './components/TimerFinishedPage';
import ThankYouPage from './components/ThankYouPage';
import QuestionSelectionPage from './components/QuestionSelectionPage';
import AllQuestionsCompletedPage from './components/AllQuestionsCompletedPage';

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <>
      <div className="ambient-bg"></div>
      <div
        className="app-container"
        style={{
          minHeight: '100vh',
          padding: isLanding ? '0' : '2rem',
          boxSizing: 'border-box',
          width: '100vw',
          overflow: isLanding ? 'hidden' : 'auto'
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/waiting" element={<WaitingPage />} />
          <Route path="/selection" element={<QuestionSelectionPage />} />
          <Route path="/editor/:questionId" element={<EditorPage />} />
          <Route path="/timer-finished" element={<TimerFinishedPage />} />
          <Route path="/all-completed" element={<AllQuestionsCompletedPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
