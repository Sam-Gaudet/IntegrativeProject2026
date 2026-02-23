import api from './api';
import { LoginResponse } from '../types/User';

const login = async (email: string, password: string): Promise<LoginResponse['user'] & { token: string }> => {
  const res = await api.post('/api/auth/login', { email, password });
  const { access_token, user } = res.data.data;
  return { ...user, token: access_token };
};

const getMe = async (token: string) => {
  const res = await api.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
};

export default { login, getMe };
