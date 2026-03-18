import { Users, Receipt } from 'lucide-react';
import type { Group } from '../types';

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
  const currentUserId = (() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: number };
      return typeof parsed.id === 'number' ? parsed.id : null;
    } catch {
      return null;
    }
  })();

  const createdByLabel =
    currentUserId && group.created_by === currentUserId
      ? 'Created by you'
      : group.created_by_name
        ? `Created by ${group.created_by_name}`
        : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.name}</h3>

      <div className="space-y-2">
        {createdByLabel && (
          <div className="text-xs text-gray-500">
            {createdByLabel}
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">{group.member_count || 0} members</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Receipt className="w-4 h-4" />
          <span className="text-sm">₹{group.total_expenses || 0} total</span>
        </div>
      </div>
    </div>
  );
}
