import { Calendar, Pencil } from 'lucide-react';
import type { Expense } from '../types';

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
}

export default function ExpenseCard({ expense, onEdit }: ExpenseCardProps) {
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
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
