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

  updateUser: async (
    userId: number,
    data: { name: string; email: string; password_hash?: string }
  ): Promise<User> => {
    const response = await api.post<{ message: string; user: User | null }>(
      `/auth/edit/${userId}`,
      {
        name: data.name.trim(),
        email: data.email.trim(),
        ...(data.password_hash?.trim() ? { password_hash: data.password_hash } : {}),
      }
    );

    const returnedUser = response.data.user;
    if (returnedUser) {
      return {
        id: returnedUser.id,
        name: returnedUser.name,
        email: returnedUser.email,
      };
    }

    // Fallback for older backend response shapes.
    return {
      id: userId,
      name: data.name.trim(),
      email: data.email.trim(),
    };
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.post('/auth/delete-account', { password });
  },
};
