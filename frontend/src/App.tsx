import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './routes/LoginPage';
import StudentDashboard from './routes/StudentDashboard';
import ProfessorDashboard from './routes/ProfessorDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/professor"
        element={
          <ProtectedRoute role="professor">
            <ProfessorDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;