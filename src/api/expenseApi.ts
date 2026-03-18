import api from './axios';
import type { Expense, Balance } from '../types';

export const expenseApi = {
  createExpense: async (data: Expense): Promise<void> => {
    await api.post('/api/expense/create', {
      group_id: data.group_id,
      paid_by: data.paid_by,
      amount: data.amount,
      description: data.description,
      splits: data.splits,
    });
  },

  getExpenses: async (groupId: number): Promise<Expense[]> => {
    const response = await api.get(`/api/expense/groups/${groupId}`);
    return response.data as Expense[];
  },

  getBalances: async (groupId: number): Promise<Balance[]> => {
    const response = await api.get(`/api/expense/groups/${groupId}/balances`);
    return response.data as Balance[];
  },
};
