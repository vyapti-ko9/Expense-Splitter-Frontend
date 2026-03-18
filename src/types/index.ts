export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface Group {
  id: number;
  name: string;
  created_by: number;
  created_by_name?: string;
  member_count?: number;
  total_expenses?: number;
}

export interface GroupMember {
  group_id: number;
  user_id: number;
}

export interface ExpenseSplit {
  user_id: number;
  amount: number;
}

export interface Expense {
  id?: number;
  group_id: number;
  paid_by: number;
  amount: number;
  description: string;
  splits: ExpenseSplit[];
  date?: string;
  paid_by_name?: string;
}

export interface Balance {
  id: number;
  name: string;
  balance: number;
}

export interface Settlement {
  id?: number;
  group_id: number;
  from_user: number | string;
  to_user: number | string;
  amount: number;
  date?: string;
}
