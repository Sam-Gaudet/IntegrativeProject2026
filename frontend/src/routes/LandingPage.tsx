import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to the Integrative Project 2026</h1>
      <p>
        <Link to="/login">Go to Login</Link>
      </p>
    </div>
  );
};

export default LandingPage;