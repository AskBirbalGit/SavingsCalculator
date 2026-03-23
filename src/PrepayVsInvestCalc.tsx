import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRightLeft, BadgeIndianRupee, BarChart3, Info, PiggyBank, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calculateEMI, calculateTenure } from './utils/loanCalculator';

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function formatInputAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function parseAmount(value: string) {
  return Number(value.replace(/[^\d.]/g, '')) || 0;
}

function futureValueOfLumpSum(amount: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 100 / 12;
  return amount * Math.pow(1 + monthlyRate, months);
}

function futureValueOfMonthlyInvestment(amount: number, annualRate: number, months: number) {
  if (months <= 0 || amount <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return amount * months;
  return amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function computeBreakevenReturn(targetValue: number, lumpSum: number, months: number) {
  if (lumpSum <= 0 || months <= 0 || targetValue <= lumpSum) return 0;
  let low = 0;
  let high = 100;

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const value = futureValueOfLumpSum(lumpSum, mid, months);
    if (value >= targetValue) high = mid;
    else low = mid;
  }

  return high;
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold">Rs.</span>
        <input
          type="text"
          inputMode="numeric"
          value={formatInputAmount(value)}
          onChange={(e) => onChange(parseAmount(e.target.value))}
          className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] py-3 pl-12 pr-4 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
        />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  min: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-3 pr-16 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold">{suffix}</span>
      </div>
    </div>
  );
}

function DecisionCard({
  title,
  theme,
  primary,
  secondary,
  tertiary,
}: {
  title: string;
  theme: 'loan' | 'invest';
  primary: string;
  secondary: string;
  tertiary: string;
}) {
  const styles = theme === 'loan'
    ? {
        shell: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
        accent: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700',
      }
    : {
        shell: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
        accent: 'text-sky-700',
        badge: 'bg-sky-100 text-sky-700',
      };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${styles.shell}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${styles.accent}`}>{primary}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}>{theme === 'loan' ? 'Risk-Free Return' : 'Market-Linked Return'}</span>
      </div>
      <div className="mt-6 space-y-3">
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Key Output</p>
          <p className="mt-2 text-lg font-bold text-[#0d3a5c]">{secondary}</p>
        </div>
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">What You End Up With</p>
          <p className="mt-2 text-lg font-bold text-[#0d3a5c]">{tertiary}</p>
        </div>
      </div>
    </div>
  );
}

export default function PrepayVsInvestCalc() {
  const [principalInput, setPrincipalInput] = React.useState(2000000);
  const [tenureInput, setTenureInput] = React.useState(15);
  const [loanRateInput, setLoanRateInput] = React.useState(9);
  const [lumpSumInput, setLumpSumInput] = React.useState(500000);
  const [returnInput, setReturnInput] = React.useState(12);

  const principal = clamp(principalInput, 1, 1000000000);
  const tenureYears = clamp(tenureInput, 0.1, 40);
  const loanRate = clamp(loanRateInput, 0.01, 60);
  const lumpSum = clamp(lumpSumInput, 0, principal);
  const expectedReturn = clamp(returnInput, 0.01, 60);

  const validationMessages = [
    principalInput <= 0 ? 'Outstanding loan amount must be greater than zero.' : null,
    tenureInput <= 0 ? 'Remaining tenure must be greater than zero.' : null,
    loanRateInput <= 0 ? 'Loan rate must be greater than zero.' : null,
    lumpSumInput <= 0 ? 'Available lump sum must be greater than zero.' : null,
    returnInput <= 0 ? 'Expected investment return must be greater than zero.' : null,
  ].filter(Boolean) as string[];

  const months = Math.max(1, Math.round(tenureYears * 12));

  const analysis = useMemo(() => {
    const currentEmi = calculateEMI(principal, loanRate, months);
    const baseInterest = currentEmi * months - principal;

    const principalAfterPrepay = Math.max(principal - lumpSum, 0);
    const prepayMonths = principalAfterPrepay === 0
      ? 0
      : Math.ceil(calculateTenure(principalAfterPrepay, loanRate, currentEmi));
    const prepayInterest = principalAfterPrepay === 0
      ? 0
      : currentEmi * prepayMonths - principalAfterPrepay;
    const interestSaved = baseInterest - prepayInterest;
    const monthsSaved = months - prepayMonths;
    const wealthFromFreedEmi = futureValueOfMonthlyInvestment(currentEmi, expectedReturn, monthsSaved);
    const investFutureValue = futureValueOfLumpSum(lumpSum, expectedReturn, months);
    const breakevenReturn = computeBreakevenReturn(wealthFromFreedEmi, lumpSum, months);

    return {
      currentEmi,
      baseInterest,
      principalAfterPrepay,
      prepayMonths,
      prepayInterest,
      interestSaved,
      monthsSaved,
      wealthFromFreedEmi,
      investFutureValue,
      breakevenReturn,
      winner: wealthFromFreedEmi > investFutureValue ? 'prepay' : 'invest',
      advantage: Math.abs(wealthFromFreedEmi - investFutureValue),
    };
  }, [expectedReturn, loanRate, lumpSum, months, principal]);

  const chartData = [
    { name: 'Prepay Loan', value: analysis.wealthFromFreedEmi },
    { name: 'Invest Lump Sum', value: analysis.investFutureValue },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mt-6 mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
      >
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="p-6 md:p-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1b6896]">Prepay Loan vs Invest Money</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0d3a5c]">Use a lump sum to kill debt faster or let compounding do the work.</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500">
                This calculator compares two uses of the same money: prepay part of the loan now and finish early, or invest that lump sum and keep paying the loan as usual.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <MoneyInput label="Outstanding Loan" value={principalInput} onChange={setPrincipalInput} />
              <NumberInput label="Remaining Tenure" value={tenureInput} onChange={setTenureInput} suffix="years" min={0.1} step={0.1} />
              <NumberInput label="Loan Rate" value={loanRateInput} onChange={setLoanRateInput} suffix="%" min={0.01} step={0.1} />
              <MoneyInput label="Available Lump Sum" value={lumpSumInput} onChange={setLumpSumInput} />
              <NumberInput label="Expected Return" value={returnInput} onChange={setReturnInput} suffix="%" min={0.01} step={0.1} />
            </div>
            {validationMessages.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {validationMessages.join(' ')}
              </div>
            ) : null}
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-[#144d78] via-[#1b6896] to-[#0d3a5c] p-6 text-white md:p-8">
            <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#46b8c3]/20 blur-3xl" />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8edce4]">Decision Snapshot</p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                {analysis.winner === 'prepay' ? 'Prepayment leads at this horizon.' : 'Investing leads at this horizon.'}
              </h3>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Current EMI</p>
                  <p className="mt-2 text-2xl font-bold">Rs. {formatCurrency(analysis.currentEmi)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Lead Over Other Option</p>
                  <p className="mt-2 text-2xl font-bold text-[#8edce4]">Rs. {formatCurrency(analysis.advantage)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Breakeven Return For Investing</p>
                  <p className="mt-2 text-2xl font-bold">{analysis.breakevenReturn.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <DecisionCard
          title="Option A"
          theme="loan"
          primary="Prepay The Loan"
          secondary={`Interest saved: Rs. ${formatCurrency(analysis.interestSaved)}`}
          tertiary={`Invest freed EMI for ${analysis.monthsSaved} months = Rs. ${formatCurrency(analysis.wealthFromFreedEmi)}`}
        />
        <DecisionCard
          title="Option B"
          theme="invest"
          primary="Invest The Lump Sum"
          secondary={`Future value after ${months} months: Rs. ${formatCurrency(analysis.investFutureValue)}`}
          tertiary={`Loan continues for ${months} months at EMI Rs. ${formatCurrency(analysis.currentEmi)}`}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={`mb-8 rounded-3xl border p-6 shadow-sm ${
          analysis.winner === 'prepay'
            ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50'
            : 'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50'
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${analysis.winner === 'prepay' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
              {analysis.winner === 'prepay' ? <BadgeIndianRupee className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${analysis.winner === 'prepay' ? 'text-emerald-600' : 'text-sky-600'}`}>Dynamic Verdict</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0d3a5c]">
                {analysis.winner === 'prepay' ? 'Prepayment is the stronger calculation here.' : 'Investing is the stronger calculation here.'}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                With a loan rate of {loanRate.toFixed(2)}% and expected investment return of {expectedReturn.toFixed(2)}%, the leading option is ahead by <span className="font-bold text-[#0d3a5c]">Rs. {formatCurrency(analysis.advantage)}</span> at the end of the original loan horizon.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-[#0d3a5c]">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Important catch
            </div>
            <p className="mt-2">
              Loan prepayment is a near risk-free return equal to loan interest avoided. Investing can win, but only if actual returns beat that hurdle consistently.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
              <BarChart3 className="h-5 w-5 text-[#144d78]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0d3a5c]">Outcome Comparison</h3>
              <p className="text-sm text-slate-500">Value created by each decision at the end of the original tenure</p>
            </div>
          </div>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} width={70} />
                <Tooltip formatter={(value: number) => `Rs. ${formatCurrency(value)}`} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#1b6896" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-[#1b6896]" />
              <h3 className="text-xl font-bold text-[#0d3a5c]">Prepay Math</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Outstanding after prepayment: <span className="font-semibold text-[#0d3a5c]">Rs. {formatCurrency(analysis.principalAfterPrepay)}</span></p>
              <p>Loan closes in: <span className="font-semibold text-[#0d3a5c]">{analysis.prepayMonths} months</span></p>
              <p>Time saved: <span className="font-semibold text-[#0d3a5c]">{analysis.monthsSaved} months</span></p>
              <p>Interest saved: <span className="font-semibold text-emerald-700">Rs. {formatCurrency(analysis.interestSaved)}</span></p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <PiggyBank className="h-5 w-5 text-[#1b6896]" />
              <h3 className="text-xl font-bold text-[#0d3a5c]">Invest Math</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Lump sum invested today: <span className="font-semibold text-[#0d3a5c]">Rs. {formatCurrency(lumpSum)}</span></p>
              <p>Assumed CAGR / annual return: <span className="font-semibold text-[#0d3a5c]">{expectedReturn.toFixed(2)}%</span></p>
              <p>Future value by loan end: <span className="font-semibold text-sky-700">Rs. {formatCurrency(analysis.investFutureValue)}</span></p>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-bold text-[#0d3a5c]">How To Read This</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Prepayment behaves like a guaranteed return close to your loan rate, because every rupee prepaid stops future interest. Investing can beat it, but only if actual returns exceed the breakeven rate and the investor can tolerate market volatility.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
