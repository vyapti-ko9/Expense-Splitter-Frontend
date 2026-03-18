import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import ExpenseCard from '../components/ExpenseCard';
import BalanceCard from '../components/BalanceCard';
import ExpenseModal from '../components/ExpenseModal';
import type { User, Expense, Balance, Settlement } from '../types';
import { groupApi } from '../api/groupApi';
import { expenseApi } from '../api/expenseApi';
import { settlementApi } from '../api/settlementApi';

type Tab = 'expenses' | 'balances' | 'settlements';

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [user, setUser] = useState<User | null>(null);
  const [groupName] = useState('Trip to Goa');
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleFrom, setSettleFrom] = useState<number | ''>('');
  const [settleTo, setSettleTo] = useState<number | ''>('');
  const [settleAmount, setSettleAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settleErrors, setSettleErrors] = useState<{ from?: string; to?: string; amount?: string }>({});
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const memberName = (value: Settlement['from_user'] | Settlement['to_user']) => {
    if (value === null || value === undefined || value === '') {
      return 'Unknown user';
    }
    if (typeof value === 'string') return value;

    const found = members.find((m) => m.id === value);
    return found?.name ?? `User ${value}`;
  };

  const formatSettlementText = (s: Settlement) => {
    const currentUserId = user?.id;
    const fromId = typeof s.from_user === 'number' ? s.from_user : null;
    const toId = typeof s.to_user === 'number' ? s.to_user : null;

    const fromName = memberName(s.from_user);
    const toName = memberName(s.to_user);

    if (currentUserId && fromId === currentUserId) {
      return `You paid ${toName}`;
    }

    if (currentUserId && toId === currentUserId) {
      return `${fromName} paid you`;
    }

    return `${fromName} paid ${toName}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rawMembers, b, s, ex] = await Promise.all([
          groupApi.getMembers(gid),
          expenseApi.getBalances(gid),
          settlementApi.getSettlements(gid),
          expenseApi.getExpenses(gid),
        ]);

        const normalizedMembers: User[] = rawMembers.map((m: any) => ({
          id: m.id ?? m.user_id,
          name: m.name,
          email: m.email,
        }));

        const normalizedSettlements: Settlement[] = (s as any[]).map((item) => ({
          id: item.id,
          group_id: gid,
          from_user: item.paid_by ?? item.from_user ?? 'Unknown user',
          to_user: item.to_user ?? '',
          amount: item.amount,
          date: item.created_at ?? item.date,
        }));

        setMembers(normalizedMembers);
        setBalances(b);
        setSettlements(normalizedSettlements);
        setExpenses(ex);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to load group data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, groupId]);

  const handleAddExpense = async (expenseData: {
    description: string;
    amount: number;
    paid_by: number;
    splits: { user_id: number; amount: number }[];
  }) => {
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    try {
      setLoading(true);
      setError(null);
      await expenseApi.createExpense({
        group_id: gid,
        paid_by: expenseData.paid_by,
        amount: expenseData.amount,
        description: expenseData.description,
        splits: expenseData.splits,
      });

      const [updatedBalances, updatedExpenses] = await Promise.all([
        expenseApi.getBalances(gid),
        expenseApi.getExpenses(gid),
      ]);
      setBalances(updatedBalances);
      setExpenses(updatedExpenses);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create expense.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    const nextErrors: typeof settleErrors = {};
    if (settleFrom === '') nextErrors.from = 'From is required';
    if (settleTo === '') nextErrors.to = 'To is required';

    const amt = Number(settleAmount);
    if (!settleAmount.trim()) nextErrors.amount = 'Amount is required';
    else if (!Number.isFinite(amt) || amt <= 0) nextErrors.amount = 'Enter a valid amount';

    if (settleFrom !== '' && settleTo !== '' && settleFrom === settleTo) {
      nextErrors.to = 'From and To must be different';
    }

    if (Object.keys(nextErrors).length > 0) {
      setSettleErrors(nextErrors);
      return;
    }
    setSettleErrors({});

    try {
      setLoading(true);
      setError(null);
      await settlementApi.createSettlement({
        group_id: gid,
        from_user: settleFrom,
        to_user: settleTo,
        amount: amt,
      });

      const [updatedSettlements, updatedBalances] = await Promise.all([
        settlementApi.getSettlements(gid),
        expenseApi.getBalances(gid),
      ]);
      setSettlements(updatedSettlements);
      setBalances(updatedBalances);

      setSettleFrom('');
      setSettleTo('');
      setSettleAmount('');
      setShowSettleModal(false);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to record settlement.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    if (!addMemberEmail.trim()) {
      setAddMemberError('Email is required');
      return;
    }

    try {
      setLoading(true);
      setAddMemberError(null);
      setError(null);

      await groupApi.addMemberByEmail(gid, addMemberEmail.trim());
      const rawUpdatedMembers = await groupApi.getMembers(gid);
      const normalizedMembers: User[] = rawUpdatedMembers.map((m: any) => ({
        id: m.id ?? m.user_id,
        name: m.name,
        email: m.email,
      }));
      setMembers(normalizedMembers);
      setAddMemberEmail('');
      setShowAddMemberModal(false);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to add member.';
      setAddMemberError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={user?.name} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{groupName}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>{members.length} members</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'expenses'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setActiveTab('balances')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'balances'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Balances
                  </button>
                  <button
                    onClick={() => setActiveTab('settlements')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'settlements'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Settlements
                  </button>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {activeTab === 'expenses' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">All Expenses</h2>
                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Expense
                      </button>
                    </div>
                    <div className="space-y-3">
                      {loading && expenses.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Loading...</p>
                      ) : expenses.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No expenses yet</p>
                      ) : (
                        expenses.map((expense) => (
                          <ExpenseCard key={expense.id} expense={expense} />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'balances' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Balances</h2>
                    <div className="space-y-3">
                      {loading && balances.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Loading...</p>
                      ) : (
                        balances.map((balance) => <BalanceCard key={balance.id} balance={balance} />)
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'settlements' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Settlement History</h2>
                      <button
                        onClick={() => setShowSettleModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Settle Payment
                      </button>
                    </div>
                    <div className="space-y-3">
                      {loading && settlements.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Loading...</p>
                      ) : settlements.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No settlements yet</p>
                      ) : (
                        settlements.map((settlement) => (
                          <div
                            key={settlement.id}
                            className="bg-green-50 border border-green-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formatSettlementText(settlement)}
                                </p>
                                {settlement.date && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {new Date(settlement.date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <p className="text-lg font-semibold text-green-600">
                                ₹{settlement.amount}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Members</h3>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleAddExpense}
        members={members}
        currentUserId={user?.id || 1}
      />

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Member</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              {addMemberError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {addMemberError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member email
                </label>
                <input
                  type="email"
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="friend@example.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setAddMemberError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettleModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Settle Payment</h3>
            <form onSubmit={handleSettlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <select
                  value={settleFrom}
                  onChange={(e) => setSettleFrom(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${settleErrors.from ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {settleErrors.from && (
                  <p className="mt-1 text-sm text-red-600">{settleErrors.from}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <select
                  value={settleTo}
                  onChange={(e) => setSettleTo(e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${settleErrors.to ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {settleErrors.to && <p className="mt-1 text-sm text-red-600">{settleErrors.to}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${settleErrors.amount ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                  placeholder="0.00"
                />
                {settleErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{settleErrors.amount}</p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
