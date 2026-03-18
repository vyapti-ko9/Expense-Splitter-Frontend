import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Balance } from '../types';

interface BalanceCardProps {
  balance: Balance;
}

export default function BalanceCard({ balance }: BalanceCardProps) {
  const isPositive = balance.balance > 0;
  const isZero = balance.balance === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isZero
              ? 'bg-gray-100'
              : isPositive
                ? 'bg-green-100'
                : 'bg-red-100'
              }`}
          >
            {!isZero &&
              (isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ))}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{balance.name}</h4>
            <p className="text-sm text-gray-500">
              {isZero
                ? 'Settled up'
                : isPositive
                  ? 'Gets back'
                  : 'Owes'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-semibold ${isZero
              ? 'text-gray-500'
              : isPositive
                ? 'text-green-600'
                : 'text-red-600'
              }`}
          >
            ₹{Math.abs(balance.balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
