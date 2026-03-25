import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, BadgeIndianRupee, ChevronDown, ChevronUp, Info, PieChart, Table2 } from 'lucide-react';
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';

type LoanSummary = {
  emi: number;
  totalInterest: number;
  totalAmount: number;
  monthsPaid: number;
  prepaymentPaid: number;
};

type ScheduleRow = {
  month: number;
  flatEmi: number;
  flatInterest: number;
  flatBalanceForInterest: number;
  flatPrincipalPaidThisMonth: number;
  flatOutstanding: number;
  flatPrepayment: number;
  reducingEmi: number;
  reducingInterest: number;
  reducingPrincipalPaidThisMonth: number;
  reducingOutstanding: number;
  reducingPrepayment: number;
};

type PrepaymentMode = 'none' | 'partial' | 'full';

const DEFAULT_PRINCIPAL = 100000;
const DEFAULT_TENURE_YEARS = 3;
const DEFAULT_RATE = 10;

const PREPAYMENT_OPTIONS: { value: PrepaymentMode; label: string; description: string }[] = [
  { value: 'none', label: 'No Prepayment', description: 'Regular EMI flow for the full tenure.' },
  { value: 'partial', label: 'Partial Prepayment', description: 'Lump sum paid once within the loan term.' },
  { value: 'full', label: 'Full Preclosure', description: 'Close the remaining loan in one shot.' },
];

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

function calculateReducingEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function solveEquivalentReducingRate(principal: number, targetEmi: number, months: number) {
  if (principal <= 0 || targetEmi <= 0 || months <= 0) return 0;

  const zeroRateEmi = principal / months;
  if (targetEmi <= zeroRateEmi) return 0;

  let low = 0;
  let high = 100;

  while (calculateReducingEmi(principal, high, months) < targetEmi) {
    high *= 2;
    if (high >= 1_000) break;
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const emiAtMid = calculateReducingEmi(principal, mid, months);
    if (emiAtMid < targetEmi) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function getPrepaymentMonth(months: number, prepaymentYear: number) {
  return clamp(Math.round(prepaymentYear * 12), 1, months);
}

function buildSchedules(
  principal: number,
  annualRate: number,
  months: number,
  flatEmi: number,
  reducingEmi: number,
  prepaymentMode: PrepaymentMode,
  prepaymentMonth: number,
  requestedPrepaymentAmount: number,
) {
  const monthlyRate = annualRate / 100 / 12;
  const flatInterestPerMonth = (principal * (annualRate / 100)) / 12;
  const flatPrincipalPerMonth = principal / months;
  let flatOutstanding = principal;
  let reducingOutstanding = principal;
  let flatInterestPaid = 0;
  let reducingInterestPaid = 0;
  let flatPrepaymentPaid = 0;
  let reducingPrepaymentPaid = 0;
  let flatMonthsPaid = 0;
  let reducingMonthsPaid = 0;

  const rows: ScheduleRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    const shouldPrepay = prepaymentMode !== 'none' && month === prepaymentMonth;
    const scheduledFlatPrincipal = Math.min(flatOutstanding, flatPrincipalPerMonth);
    const flatPrepayment = shouldPrepay
      ? Math.min(
          Math.max(flatOutstanding - scheduledFlatPrincipal, 0),
          prepaymentMode === 'full' ? flatOutstanding : requestedPrepaymentAmount,
        )
      : 0;

    const flatPrincipalPaidThisMonth = Math.min(flatOutstanding, scheduledFlatPrincipal + flatPrepayment);
    const flatEmiPaid = flatOutstanding > 0 ? Math.min(flatEmi, flatInterestPerMonth + flatOutstanding) : 0;
    flatOutstanding = Math.max(0, flatOutstanding - flatPrincipalPaidThisMonth);
    flatInterestPaid += flatOutstanding + flatPrincipalPaidThisMonth > 0 ? flatInterestPerMonth : 0;
    flatPrepaymentPaid += flatPrepayment;
    if (flatEmiPaid > 0 || flatPrepayment > 0) flatMonthsPaid = month;

    const reducingInterest = reducingOutstanding * monthlyRate;
    const scheduledReducingPrincipal = reducingOutstanding > 0
      ? Math.min(reducingOutstanding, Math.max(reducingEmi - reducingInterest, 0))
      : 0;
    const reducingPrepayment = shouldPrepay
      ? Math.min(
          Math.max(reducingOutstanding - scheduledReducingPrincipal, 0),
          prepaymentMode === 'full' ? reducingOutstanding : requestedPrepaymentAmount,
        )
      : 0;
    const reducingPrincipalPaidThisMonth = Math.min(reducingOutstanding, scheduledReducingPrincipal + reducingPrepayment);
    const reducingEmiPaid = reducingOutstanding > 0 ? Math.min(reducingEmi, reducingInterest + reducingOutstanding) : 0;
    reducingOutstanding = Math.max(0, reducingOutstanding - reducingPrincipalPaidThisMonth);
    reducingInterestPaid += reducingEmiPaid > 0 ? reducingInterest : 0;
    reducingPrepaymentPaid += reducingPrepayment;
    if (reducingEmiPaid > 0 || reducingPrepayment > 0) reducingMonthsPaid = month;

    rows.push({
      month,
      flatEmi: flatEmiPaid,
      flatInterest: flatInterestPerMonth,
      flatBalanceForInterest: principal,
      flatPrincipalPaidThisMonth,
      flatOutstanding,
      flatPrepayment,
      reducingEmi: reducingEmiPaid,
      reducingInterest,
      reducingPrincipalPaidThisMonth,
      reducingOutstanding,
      reducingPrepayment,
    });

    if (flatOutstanding <= 0 && reducingOutstanding <= 0) break;
  }

  return {
    rows,
    flat: {
      emi: flatEmi,
      totalInterest: flatInterestPaid,
      totalAmount: principal + flatInterestPaid,
      monthsPaid: flatMonthsPaid,
      prepaymentPaid: flatPrepaymentPaid,
    },
    reducing: {
      emi: reducingEmi,
      totalInterest: reducingInterestPaid,
      totalAmount: principal + reducingInterestPaid,
      monthsPaid: reducingMonthsPaid,
      prepaymentPaid: reducingPrepaymentPaid,
    },
  };
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      {label ? <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</label> : null}
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

function ResultCard({
  title,
  tone,
  summary,
  badge,
}: {
  title: string;
  tone: 'danger' | 'success';
  summary: LoanSummary;
  badge: string;
}) {
  const styles = tone === 'danger'
    ? {
        shell: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white',
        badge: 'bg-rose-100 text-rose-700',
        value: 'text-rose-700',
      }
    : {
        shell: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
        badge: 'bg-emerald-100 text-emerald-700',
        value: 'text-emerald-700',
      };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${styles.shell}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-[#0d3a5c]">{badge}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}>{tone === 'danger' ? 'Higher Cost' : 'Bank Standard'}</span>
      </div>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Monthly EMI</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${styles.value}`}>Rs. {formatCurrency(summary.emi)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Total Interest</p>
            <p className="mt-2 text-xl font-bold text-[#0d3a5c]">Rs. {formatCurrency(summary.totalInterest)}</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Total Amount Payable</p>
            <p className="mt-2 text-xl font-bold text-[#0d3a5c]">Rs. {formatCurrency(summary.totalAmount)}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Loan Closes In</p>
            <p className="mt-2 text-xl font-bold text-[#0d3a5c]">{summary.monthsPaid} months</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Prepayment Amount Applied</p>
            <p className="mt-2 text-xl font-bold text-[#0d3a5c]">Rs. {formatCurrency(summary.prepaymentPaid)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  principal,
  interest,
  colors,
}: {
  title: string;
  principal: number;
  interest: number;
  colors: [string, string];
}) {
  const data = [
    { name: 'Principal', value: principal },
    { name: 'Interest', value: interest },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
          <PieChart className="h-5 w-5 text-[#144d78]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#0d3a5c]">{title}</h3>
          <p className="text-sm text-slate-500">Principal vs interest split after the selected prepayment scenario</p>
        </div>
      </div>
      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={102}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `Rs. ${formatCurrency(value)}`}
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Principal</p>
          <p className="mt-2 text-lg font-bold text-[#0d3a5c]">Rs. {formatCurrency(principal)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Interest</p>
          <p className="mt-2 text-lg font-bold text-[#0d3a5c]">Rs. {formatCurrency(interest)}</p>
        </div>
      </div>
    </div>
  );
}

export default function FixedVsFloatingScenarioCalc() {
  const [principalInput, setPrincipalInput] = useState(DEFAULT_PRINCIPAL);
  const [tenureInput, setTenureInput] = useState(DEFAULT_TENURE_YEARS);
  const [rateInput, setRateInput] = useState(DEFAULT_RATE);
  const [prepaymentMode, setPrepaymentMode] = useState<PrepaymentMode>('none');
  const [prepaymentYearInput, setPrepaymentYearInput] = useState(2);
  const [prepaymentAmountInput, setPrepaymentAmountInput] = useState(25000);
  const [showSchedule, setShowSchedule] = useState(false);

  const principal = clamp(principalInput, 1, 1000000000);
  const tenureYears = clamp(tenureInput, 0.1, 40);
  const annualRate = clamp(rateInput, 0.01, 60);
  const prepaymentYear = clamp(prepaymentYearInput, 0.1, tenureYears);
  const requestedPrepaymentAmount = clamp(prepaymentAmountInput, 0, principal);

  const validationMessages = [
    principalInput <= 0 ? 'Loan amount must be greater than zero.' : null,
    tenureInput <= 0 ? 'Tenure must be greater than zero.' : null,
    rateInput <= 0 ? 'Interest rate must be greater than zero.' : null,
    prepaymentMode !== 'none' && prepaymentYearInput <= 0 ? 'Prepayment year must be greater than zero.' : null,
    prepaymentMode === 'partial' && prepaymentAmountInput <= 0 ? 'Partial prepayment amount must be greater than zero.' : null,
  ].filter(Boolean) as string[];

  const { months, flatEmi, reducingEmi } = useMemo(
    () => {
      const months = Math.max(1, Math.round(tenureYears * 12));
      const flatInterest = principal * (annualRate / 100) * tenureYears;
      const flatTotalAmount = principal + flatInterest;
      return {
        months,
        flatEmi: flatTotalAmount / months,
        reducingEmi: calculateReducingEmi(principal, annualRate, months),
      };
    },
    [annualRate, principal, tenureYears],
  );

  const prepaymentMonth = getPrepaymentMonth(months, prepaymentYear);
  const effectivePrepaymentAmount = prepaymentMode === 'full' ? principal : requestedPrepaymentAmount;

  const { rows: schedule, flat, reducing } = useMemo(
    () => buildSchedules(principal, annualRate, months, flatEmi, reducingEmi, prepaymentMode, prepaymentMonth, effectivePrepaymentAmount),
    [annualRate, effectivePrepaymentAmount, flatEmi, months, prepaymentMode, prepaymentMonth, principal, reducingEmi],
  );

  const extraInterest = flat.totalInterest - reducing.totalInterest;
  const extraTotalCost = flat.totalAmount - reducing.totalAmount;
  const flatEquivalentReducingRate = useMemo(
    () => solveEquivalentReducingRate(principal, flatEmi, months),
    [flatEmi, months, principal],
  );
  const schedulePrepaymentRow = prepaymentMode !== 'none' ? schedule.find((row) => row.month === prepaymentMonth) : null;
  const requestedPrepaymentLabel = prepaymentMode === 'none'
    ? 'No prepayment selected'
    : prepaymentMode === 'full'
      ? 'Full closure of remaining balance'
      : `Rs. ${formatCurrency(effectivePrepaymentAmount)}`;

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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1b6896]">Flat vs Reducing Balance EMI Calculator</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0d3a5c]">See how a flat-rate loan quietly overcharges you.</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500">
                Flat-rate loans keep charging interest on the original principal for the full tenure. Standard reducing-balance loans charge interest only on the outstanding balance.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <MoneyInput label="Loan Amount" value={principalInput} onChange={setPrincipalInput} />
              <NumberInput label="Tenure" value={tenureInput} onChange={setTenureInput} suffix="years" min={0.1} step={0.1} />
              <NumberInput label="Interest Rate" value={rateInput} onChange={setRateInput} suffix="%" min={0.01} step={0.1} />
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Prepayment Scenario</p>
                  <h3 className="mt-2 text-xl font-bold text-[#0d3a5c]">Model a one-time lump sum within the loan tenure.</h3>
                </div>
                <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                  {PREPAYMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPrepaymentMode(option.value)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        prepaymentMode === option.value
                          ? 'bg-[#144d78] text-white shadow-sm'
                          : 'text-slate-500 hover:text-[#144d78]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{PREPAYMENT_OPTIONS.find((option) => option.value === prepaymentMode)?.description}</p>
              {prepaymentMode !== 'none' ? (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <NumberInput
                    label="Prepayment Within"
                    value={prepaymentYearInput}
                    onChange={setPrepaymentYearInput}
                    suffix="years"
                    min={0.1}
                    step={0.1}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {prepaymentMode === 'full' ? 'Full Preclosure Rule' : 'Partial Prepayment Amount'}
                    </label>
                    {prepaymentMode === 'full' ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                        The calculator will close the remaining balance in month {prepaymentMonth}. The exact full-preclosure amount differs across flat and reducing methods because their outstanding balances are different by then.
                      </div>
                    ) : (
                      <MoneyInput value={prepaymentAmountInput} onChange={setPrepaymentAmountInput} />
                    )}
                  </div>
                </div>
              ) : null}
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8edce4]">Quick Read</p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">Same headline rate. Very different math.</h3>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Loan Term</p>
                  <p className="mt-2 text-2xl font-bold">{months} months</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Prepayment Event</p>
                  <p className="mt-2 text-2xl font-bold">
                    {prepaymentMode === 'none' ? 'None' : `Month ${prepaymentMonth}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Extra Interest Paid Under Flat Rate</p>
                  <p className="mt-2 text-2xl font-bold text-[#8edce4]">Rs. {formatCurrency(extraInterest)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.16em] text-white/60">Equivalent Reducing Rate</p>
                  <p className="mt-2 text-2xl font-bold">{flatEquivalentReducingRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <ResultCard title="Flat Rate Loan" tone="danger" summary={flat} badge="Flat Rate" />
        <ResultCard title="Reducing Balance Loan" tone="success" summary={reducing} badge="Reducing Balance" />
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#144d78]/10">
            <BadgeIndianRupee className="h-5 w-5 text-[#144d78]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#0d3a5c]">Prepayment Calculation</h3>
            <p className="text-sm text-slate-500">Shows exactly what prepayment amount is applied and what the loan balance becomes after that month.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prepayment Type</p>
            <p className="mt-2 text-lg font-bold text-[#0d3a5c]">{PREPAYMENT_OPTIONS.find((option) => option.value === prepaymentMode)?.label}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Applied In</p>
            <p className="mt-2 text-lg font-bold text-[#0d3a5c]">{prepaymentMode === 'none' ? 'Not applied' : `Month ${prepaymentMonth}`}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Requested Prepayment</p>
            <p className="mt-2 text-lg font-bold text-[#0d3a5c]">{requestedPrepaymentLabel}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Result</p>
            <p className="mt-2 text-lg font-bold text-[#0d3a5c]">
              {prepaymentMode === 'none'
                ? 'Regular EMI path'
                : prepaymentMode === 'full'
                  ? 'Loan closes at that month'
                  : 'Outstanding balance drops'}
            </p>
          </div>
        </div>
        {prepaymentMode !== 'none' && schedulePrepaymentRow ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Flat Rate At Prepayment Month</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>EMI in month {prepaymentMonth}: <span className="font-semibold">Rs. {formatCurrency(schedulePrepaymentRow.flatEmi)}</span></p>
                <p>Prepayment applied: <span className="font-semibold">Rs. {formatCurrency(schedulePrepaymentRow.flatPrepayment)}</span></p>
                <p>Outstanding after that month: <span className="font-semibold text-rose-700">Rs. {formatCurrency(schedulePrepaymentRow.flatOutstanding)}</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Reducing Balance At Prepayment Month</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>EMI in month {prepaymentMonth}: <span className="font-semibold">Rs. {formatCurrency(schedulePrepaymentRow.reducingEmi)}</span></p>
                <p>Prepayment applied: <span className="font-semibold">Rs. {formatCurrency(schedulePrepaymentRow.reducingPrepayment)}</span></p>
                <p>Outstanding after that month: <span className="font-semibold text-emerald-700">Rs. {formatCurrency(schedulePrepaymentRow.reducingOutstanding)}</span></p>
              </div>
            </div>
          </div>
        ) : null}
        {prepaymentMode !== 'none' ? (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Why Can Flat Prepayment Look Lower?</p>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                In this calculator, the flat-rate loan repays principal in a straight-line pattern, so by month {prepaymentMonth} it may show a lower remaining balance available for prepayment.
              </p>
              <p>
                The reducing-balance loan usually remains more interest-heavy in the early months, so the outstanding can still be higher at the same point in time.
              </p>
              <p>
                That does <span className="font-semibold">not</span> mean flat rate is cheaper. It usually means you have already been charged interest less fairly, because flat-rate pricing keeps using the original principal as the interest base until closure.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mb-8 rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Dynamic Verdict</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0d3a5c]">Warning: the flat-rate option is the expensive one.</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                At {annualRate.toFixed(2)}%, this flat-rate loan still costs <span className="font-bold text-rose-700">Rs. {formatCurrency(extraInterest)} more in interest</span> and <span className="font-bold text-rose-700">Rs. {formatCurrency(extraTotalCost)} more overall</span> than a reducing-balance loan{prepaymentMode === 'none' ? '.' : ` even after the ${prepaymentMode === 'full' ? 'full preclosure' : 'prepayment'} in month ${prepaymentMonth}.`}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-[#0d3a5c]">
              <BadgeIndianRupee className="h-4 w-4 text-rose-600" />
              Flat-rate trap signal
            </div>
            <p className="mt-2">Higher EMI is obvious. The hidden damage is that interest keeps getting charged as if the balance never shrank.</p>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Flat Rate Breakdown" principal={principal} interest={flat.totalInterest} colors={['#fb7185', '#e11d48']} />
        <ChartCard title="Reducing Balance Breakdown" principal={principal} interest={reducing.totalInterest} colors={['#4ade80', '#15803d']} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#144d78]/10">
              <Info className="h-5 w-5 text-[#1b6896]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0d3a5c]">Effective Interest Rate Insight</h3>
              <p className="text-sm text-slate-500">Why a flat rate headline looks cheaper than it really is</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <p className="text-base leading-relaxed text-slate-600">
              A flat rate of <span className="font-bold text-[#0d3a5c]">{annualRate.toFixed(2)}%</span> matches a reducing-balance rate of <span className="font-bold text-[#0d3a5c]">{flatEquivalentReducingRate.toFixed(2)}%</span> when both loans have the same principal, tenure, and EMI.
              That is because the lender keeps charging interest on the original principal instead of the declining balance.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Rule Of Thumb</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#0d3a5c]">1.8x to 1.9x</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Flat-rate offers usually feel cheaper only because the quoted rate is not directly comparable with a normal bank reducing rate.
          </p>
        </div>
      </div>

      <div className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowSchedule((current) => !current)}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
              <Table2 className="h-5 w-5 text-[#144d78]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0d3a5c]">View Month-by-Month Breakdown</h3>
              <p className="text-sm text-slate-500">Compare flat-rate interest basis vs reducing-balance outstanding principal</p>
            </div>
          </div>
          {showSchedule ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </button>

        {showSchedule ? (
          <div className="border-t border-slate-200">
            <div className="px-6 py-4 text-sm text-slate-500">
              Flat-rate lenders keep using <span className="font-semibold text-rose-600">Rs. {formatCurrency(principal)}</span> as the interest base every month until closure. In the reducing method, the outstanding balance drops after each EMI and falls faster once prepayment hits.
            </div>
            {prepaymentMode !== 'none' ? (
              <div className="mx-6 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                The highlighted row is the prepayment month. That row includes both the regular EMI and the extra lump-sum payment, and the outstanding balance shown is after prepayment is applied.
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-rose-600">Flat EMI</th>
                    <th className="px-4 py-3 text-rose-600">Flat Interest</th>
                    <th className="px-4 py-3 text-rose-600">Balance Used For Interest</th>
                    <th className="px-4 py-3 text-rose-600">Flat Principal Paid</th>
                    <th className="px-4 py-3 text-rose-600">Flat Prepayment</th>
                    <th className="px-4 py-3 text-rose-600">Flat Outstanding</th>
                    <th className="px-4 py-3 text-emerald-700">Reducing EMI</th>
                    <th className="px-4 py-3 text-emerald-700">Reducing Interest</th>
                    <th className="px-4 py-3 text-emerald-700">Reducing Principal Paid</th>
                    <th className="px-4 py-3 text-emerald-700">Reducing Prepayment</th>
                    <th className="px-4 py-3 text-emerald-700">Reducing Outstanding</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {schedule.map((row) => (
                    <tr key={row.month} className={`border-b border-slate-100 hover:bg-slate-50/60 ${row.month === prepaymentMonth && prepaymentMode !== 'none' ? 'bg-amber-50/70' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-[#0d3a5c]">{row.month}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.flatEmi)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.flatInterest)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-700">Rs. {formatCurrency(row.flatBalanceForInterest)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.flatPrincipalPaidThisMonth)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.flatPrepayment)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-700">Rs. {formatCurrency(row.flatOutstanding)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.reducingEmi)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.reducingInterest)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.reducingPrincipalPaidThisMonth)}</td>
                      <td className="px-4 py-3 text-slate-600">Rs. {formatCurrency(row.reducingPrepayment)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">Rs. {formatCurrency(row.reducingOutstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
