import api from './axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

export const authApi = {
  register: async (data: RegisterData): Promise<void> => {
    await api.post('/auth/register', {
      name: data.name,
      email: data.email,
      password_hash: data.password,
    });
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });

    const { accessToken, sanitizedUser } = response.data as {
      accessToken: string;
      sanitizedUser: User;
    };

    const mapped: AuthResponse = {
      token: accessToken,
      user: {
        id: sanitizedUser.id,
        name: sanitizedUser.name,
        email: sanitizedUser.email,
      },
    };

    return mapped;
  },
};
