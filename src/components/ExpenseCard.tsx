import { Calendar } from 'lucide-react';
import type { Expense } from '../types';

interface ExpenseCardProps {
  expense: Expense;
}

export default function ExpenseCard({ expense }: ExpenseCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{expense.description}</h4>
          <p className="text-sm text-gray-600 mt-1">Paid by {expense.paid_by_name || `User ${expense.paid_by}`}</p>
          {expense.date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(expense.date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">₹{expense.amount}</p>
        </div>
      </div>
    </div>
  );
}
