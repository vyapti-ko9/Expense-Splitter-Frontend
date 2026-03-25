import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Users, UserMinus } from 'lucide-react';
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
  const [groupName, setGroupName] = useState('Group');
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
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidBy, setEditPaidBy] = useState<number | ''>('');
  const [editExpenseError, setEditExpenseError] = useState<string | null>(null);
  const [updatingExpense, setUpdatingExpense] = useState(false);

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

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const computeDerivedBalances = (
    currentMembers: User[],
    currentExpenses: Expense[],
    currentSettlements: Settlement[]
  ): Balance[] => {
    if (currentMembers.length === 0) return [];

    const balanceByUser = new Map<number, number>();
    currentMembers.forEach((member) => balanceByUser.set(member.id, 0));

    for (const exp of currentExpenses) {
      const totalAmount = Number(exp.amount);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) continue;

      const splitAmount = totalAmount / currentMembers.length;
      for (const member of currentMembers) {
        balanceByUser.set(member.id, (balanceByUser.get(member.id) ?? 0) - splitAmount);
      }

      const paidBy = Number((exp as any).paid_by);
      if (balanceByUser.has(paidBy)) {
        balanceByUser.set(paidBy, (balanceByUser.get(paidBy) ?? 0) + totalAmount);
      }
    }

    for (const settlement of currentSettlements) {
      const fromUser = Number(settlement.from_user);
      const toUser = Number(settlement.to_user);
      const amount = Number(settlement.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (!balanceByUser.has(fromUser) || !balanceByUser.has(toUser)) continue;

      // `from_user` pays `to_user`: payer owes less, receiver gets back less.
      balanceByUser.set(fromUser, (balanceByUser.get(fromUser) ?? 0) + amount);
      balanceByUser.set(toUser, (balanceByUser.get(toUser) ?? 0) - amount);
    }

    return currentMembers.map((member) => ({
      id: member.id,
      name: member.name,
      balance: round2(balanceByUser.get(member.id) ?? 0),
    }));
  };

  const loadGroupData = async (gid: number) => {
    const [rawMembers, s, ex, groups] = await Promise.all([
      groupApi.getMembers(gid),
      settlementApi.getSettlements(gid),
      expenseApi.getExpenses(gid),
      groupApi.getGroups(),
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

    const currentGroup = groups.find((g) => g.id === gid);
    const derivedBalances = computeDerivedBalances(normalizedMembers, ex, normalizedSettlements);
    setGroupName(currentGroup?.name?.trim() ? currentGroup.name : `Group #${gid}`);
    setMembers(normalizedMembers);
    setBalances(derivedBalances);
    setSettlements(normalizedSettlements);
    setExpenses(ex);
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

        await loadGroupData(gid);
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

      await loadGroupData(gid);
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

      await loadGroupData(gid);

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
      await loadGroupData(gid);
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

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    const memberId = memberToRemove.id;

    try {
      setRemovingMemberId(memberId);
      setError(null);
      await groupApi.removeMember(gid, memberId);
      await loadGroupData(gid);
      setMemberToRemove(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to remove member.';
      setError(message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setEditDescription(expense.description ?? '');
    setEditAmount(String(expense.amount ?? ''));
    setEditPaidBy(Number(expense.paid_by));
    setEditExpenseError(null);
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense?.id) return;

    const gid = Number(groupId);
    if (!Number.isFinite(gid)) return;

    const amountNum = Number(editAmount);
    const paidByNum = Number(editPaidBy);
    if (!editDescription.trim()) {
      setEditExpenseError('Description is required');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setEditExpenseError('Enter a valid amount');
      return;
    }
    if (!Number.isFinite(paidByNum) || paidByNum <= 0) {
      setEditExpenseError('Please select who paid');
      return;
    }

    try {
      setUpdatingExpense(true);
      setError(null);
      setEditExpenseError(null);

      await expenseApi.updateExpense(editingExpense.id, {
        description: editDescription.trim(),
        amount: amountNum,
        paid_by: paidByNum,
      });

      await loadGroupData(gid);
      setEditingExpense(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update expense.';
      setEditExpenseError(message);
    } finally {
      setUpdatingExpense(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
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
                          <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            onEdit={openEditExpenseModal}
                          />
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
                            className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:shadow-sm dark:shadow-black/20"
                          >
                            <div className="flex justify-between items-center gap-4">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {formatSettlementText(settlement)}
                                </p>
                                {settlement.date && (
                                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    {new Date(settlement.date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <p className="shrink-0 text-lg font-semibold tabular-nums text-green-700 dark:text-emerald-400">
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
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-600 font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>
                    {user && member.id !== user.id && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        disabled={removingMemberId === member.id}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                        {removingMemberId === member.id ? '…' : 'Remove'}
                      </button>
                    )}
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

      {memberToRemove && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-title"
          onClick={() => {
            if (!removingMemberId) setMemberToRemove(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <UserMinus className="h-5 w-5 text-red-600" aria-hidden />
              </div>
              <div>
                <h3 id="remove-member-title" className="text-xl font-semibold text-gray-900">
                  Remove member?
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-900">{memberToRemove.name}</span>
                  {memberToRemove.email ? (
                    <span className="text-gray-500"> ({memberToRemove.email})</span>
                  ) : null}{' '}
                  will be removed from this group. This does not delete their account.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => !removingMemberId && setMemberToRemove(null)}
                disabled={!!removingMemberId}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveMember()}
                disabled={!!removingMemberId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {removingMemberId ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {editingExpense && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Expense</h3>
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              {editExpenseError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editExpenseError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., Dinner at restaurant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paid by</label>
                <select
                  value={editPaidBy}
                  onChange={(e) => setEditPaidBy(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !updatingExpense && setEditingExpense(null)}
                  disabled={updatingExpense}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingExpense}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {updatingExpense ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
