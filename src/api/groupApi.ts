import api from './axios';
import type { Group, User } from '../types';

export const groupApi = {
  getGroups: async (): Promise<Group[]> => {
    const response = await api.get('/api/group/my');
    return response.data as Group[];
  },

  createGroup: async (name: string, createdBy: number): Promise<void> => {
    await api.post('/api/group/create-group', {
      name,
      created_by: createdBy,
    });
  },

  getMembers: async (groupId: number): Promise<User[]> => {
    const response = await api.get(`/api/group/members/${groupId}`);
    const payload = response.data as { result?: User[] } | User[];

    if (Array.isArray(payload)) return payload;
    return (payload.result ?? []) as User[];
  },

  addMember: async (groupId: number, userId: number): Promise<void> => {
    await api.post(`/api/group/add-member/${groupId}/member`, {
      user_id: userId,
    });
  },

  addMemberByEmail: async (groupId: number, email: string): Promise<void> => {
    await api.post(`/api/group/${groupId}/add-member-email`, { email });
  },

  removeMember: async (groupId: number, userId: number): Promise<void> => {
    await api.post(`/api/group/remove-member/${groupId}/member`, {
      user_id: userId,
    });
  },
};
