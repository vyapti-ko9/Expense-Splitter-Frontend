import api from './axios';
import type { Settlement } from '../types';

export const settlementApi = {
  createSettlement: async (data: Settlement): Promise<void> => {
    await api.post('/api/settlements/create', {
      group_id: data.group_id,
      from_user: data.from_user,
      to_user: data.to_user,
      amount: data.amount,
    });
  },

  getSettlements: async (groupId: number): Promise<Settlement[]> => {
    const response = await api.get(`/api/settlements/expenses/${groupId}`);
    const payload = response.data as { result?: Settlement[] } | Settlement[];

    if (Array.isArray(payload)) return payload;
    return (payload.result ?? []) as Settlement[];
  },
};
