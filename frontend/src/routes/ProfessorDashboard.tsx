import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const ProfessorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [professor, setProfessor] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/auth/me').then(res => setProfessor(res.data.data));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  if (!professor) return <div>Loading...</div>;

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <div>
        <h2>Professor Dashboard</h2>
        <p>Hello, <strong>{user?.full_name}</strong>!</p>
    </div>
    <button onClick={handleLogout}>Logout</button>
    </div>

      <p>Name: {professor.full_name}</p>
      <p>Department: {professor.department}</p>
      <p>Status: Available / Busy / Away (toggle coming later)</p>
    </div>
  );
};


export default ProfessorDashboard;
