import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AvailabilityCard from '../components/AvailabilityCard';

interface Professor {
  id: string;
  full_name: string;
  department: string;
  availability_status: 'available' | 'busy' | 'away';
}

const StudentDashboard: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/professors')
      .then(res => setProfessors(res.data.data))
      .catch(err => console.error(err));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

    return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
            <h2>Student Dashboard</h2>
            <p>Hello, <strong>{user?.full_name}</strong>!</p>
        </div>
        <button onClick={handleLogout}>Logout</button>
        </div>

        <h3>Professors</h3>
        {professors.map(p => (
        <AvailabilityCard key={p.id} professor={p} />
        ))}
    </div>
    );
};


export default StudentDashboard;
