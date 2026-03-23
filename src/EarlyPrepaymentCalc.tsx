import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { BarChart3, CheckCircle2, Clock3, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateEMI, formatCurrency, formatLakhs } from './utils/loanCalculator';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatIndianNumber(amount: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

function parseIndian(value: string) {
  return Number(value.replace(/\D/g, '')) || 0;
}

function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">Rs.</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatIndianNumber(value)}
        onChange={(e) => onChange(parseIndian(e.target.value))}
        className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] py-2 pl-11 pr-4 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
      />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 pr-14 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
      />
      {suffix ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">{suffix}</span> : null}
    </div>
  );
}

type ScenarioResult = {
  label: string;
  initialEmi: number;
  monthsPaid: number;
  totalInterest: number;
  totalOutflow: number;
  endingBalance: number;
  yearlyBalances: { year: number; balance: number }[];
};

function simulatePrepaymentScenario({
  label,
  principal,
  tenureMonths,
  startRate,
  resetMonth,
  rateAfterReset,
  extraPrepay,
  aggressiveMonths,
}: {
  label: string;
  principal: number;
  tenureMonths: number;
  startRate: number;
  resetMonth?: number;
  rateAfterReset?: number;
  extraPrepay: number;
  aggressiveMonths: number;
}): ScenarioResult {
  let balance = principal;
  let currentRate = startRate;
  let emi = calculateEMI(balance, currentRate, tenureMonths);
  const yearlyBalances: { year: number; balance: number }[] = [];
  let totalInterest = 0;
  let totalOutflow = 0;
  let month = 0;

  while (balance > 0.5 && month < 1200) {
    month += 1;
    if (resetMonth && rateAfterReset !== undefined && month === resetMonth + 1) {
      currentRate = rateAfterReset;
      const remainingMonths = Math.max(tenureMonths - month + 1, 1);
      emi = calculateEMI(balance, currentRate, remainingMonths);
    }

    const monthlyRate = currentRate / 12 / 100;
    const interest = balance * monthlyRate;
    const scheduledPrincipal = Math.max(emi - interest, 0);
    const extra = month <= aggressiveMonths ? extraPrepay : 0;
    const actualPrincipal = Math.min(balance, scheduledPrincipal + extra);
    const payment = Math.min(balance + interest, emi + extra);

    balance = Math.max(0, balance - actualPrincipal);
    totalInterest += interest;
    totalOutflow += payment;

    if (month % 12 === 0 || balance <= 0) {
      yearlyBalances.push({ year: Math.ceil(month / 12), balance });
    }
  }

  return {
    label,
    initialEmi: calculateEMI(principal, startRate, tenureMonths),
    monthsPaid: month,
    totalInterest,
    totalOutflow,
    endingBalance: balance,
    yearlyBalances,
  };
}

export default function EarlyPrepaymentCalc() {
  const [principal, setPrincipal] = React.useState(8000000);
  const [tenureYears, setTenureYears] = React.useState(20);
  const [fixedRate, setFixedRate] = React.useState(8.35);
  const [floatingRate, setFloatingRate] = React.useState(7.85);
  const [floatingRateAfterReset, setFloatingRateAfterReset] = React.useState(9.25);
  const [resetAfterYears, setResetAfterYears] = React.useState(3);
  const [extraPrepay, setExtraPrepay] = React.useState(50000);
  const [aggressiveYears, setAggressiveYears] = React.useState(5);

  const tenureMonths = tenureYears * 12;
  const aggressiveMonths = aggressiveYears * 12;
  const resetMonth = resetAfterYears * 12;

  const fixedScenario = useMemo(
    () =>
      simulatePrepaymentScenario({
        label: 'Fixed Rate',
        principal,
        tenureMonths,
        startRate: fixedRate,
        extraPrepay,
        aggressiveMonths,
      }),
    [aggressiveMonths, extraPrepay, fixedRate, principal, tenureMonths],
  );

  const floatingScenario = useMemo(
    () =>
      simulatePrepaymentScenario({
        label: 'Floating Rate',
        principal,
        tenureMonths,
        startRate: floatingRate,
        resetMonth,
        rateAfterReset: floatingRateAfterReset,
        extraPrepay,
        aggressiveMonths,
      }),
    [aggressiveMonths, extraPrepay, floatingRate, floatingRateAfterReset, principal, resetMonth, tenureMonths],
  );

  const winner = fixedScenario.totalInterest < floatingScenario.totalInterest ? 'fixed' : 'floating';
  const interestGap = Math.abs(fixedScenario.totalInterest - floatingScenario.totalInterest);
  const timeGap = Math.abs(fixedScenario.monthsPaid - floatingScenario.monthsPaid);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mt-6 mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Loan Amount</label>
                <MoneyInput value={principal} onChange={setPrincipal} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Tenure</label>
                <NumberInput value={tenureYears} onChange={setTenureYears} suffix="years" min={1} max={35} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Fixed Rate Option</label>
                <NumberInput value={fixedRate} onChange={setFixedRate} suffix="%" step={0.05} min={1} max={25} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Floating Rate Today</label>
                <NumberInput value={floatingRate} onChange={setFloatingRate} suffix="%" step={0.05} min={1} max={25} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Floating Rate After Reset</label>
                <NumberInput value={floatingRateAfterReset} onChange={setFloatingRateAfterReset} suffix="%" step={0.05} min={1} max={25} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Reset After</label>
                <NumberInput value={resetAfterYears} onChange={setResetAfterYears} suffix="years" min={1} max={10} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Monthly Prepayment</label>
                <MoneyInput value={extraPrepay} onChange={setExtraPrepay} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Aggressive Prepay Period</label>
                <NumberInput value={aggressiveYears} onChange={setAggressiveYears} suffix="years" min={1} max={10} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1b6896] bg-[#144d78] p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8edce4]">Why This Matters</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Early EMIs are interest-heavy, so prepayment in the first 3 to 5 years has the biggest impact.</p>
              <p>Fixed helps only if it protects you from rate increases during this high-impact window.</p>
              <p>No EMI or tenure surprises means your aggressive principal reduction works more efficiently.</p>
            </div>
            <div className="mt-6 rounded-2xl border border-[#46b8c3]/30 bg-[#46b8c3]/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#46b8c3]">Truth In One Line</p>
              <p className="mt-2 text-sm text-white">
                Fixed rate is better for prepayment only when it protects you from future rate increases during your high-impact repayment period.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="relative mb-10 overflow-hidden rounded-3xl border border-[#1b6896] bg-gradient-to-br from-[#144d78] to-[#1b6896] p-8 text-center shadow-2xl md:p-12"
      >
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/2 rounded-full bg-[#46b8c3]/10 blur-3xl" />
        <h1 className="relative z-10 mb-4 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
          {winner === 'fixed' ? 'Fixed Rate Wins' : 'Floating Rate Wins'}
        </h1>
        <p className="relative z-10 mx-auto max-w-3xl text-lg leading-relaxed text-white/70 md:text-2xl">
          {winner === 'fixed'
            ? `Fixed protects your early prepayment window better by saving ${formatLakhs(interestGap)} of interest in this scenario.`
            : `Floating still stays ahead by ${formatLakhs(interestGap)} even after the rate reset assumption in this scenario.`}
        </p>
      </motion.div>

      <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        {[fixedScenario, floatingScenario].map((scenario) => (
          <motion.div
            key={scenario.label}
            initial={{ opacity: 0, x: scenario.label === 'Fixed Rate' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: scenario.label === 'Fixed Rate' ? 0.2 : 0.28 }}
            className={cn(
              'rounded-3xl border p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg',
              scenario.label === 'Fixed Rate' ? 'border-[#46b8c3]/40 bg-white' : 'border-[#1b6896] bg-[#144d78] text-white',
            )}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', scenario.label === 'Fixed Rate' ? 'bg-[#46b8c3]/10 text-[#1b6896]' : 'border border-[#46b8c3]/30 bg-[#46b8c3]/20 text-[#46b8c3]')}>
                {scenario.label === 'Fixed Rate' ? <ShieldCheck className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                {scenario.label}
              </div>
              {winner === (scenario.label === 'Fixed Rate' ? 'fixed' : 'floating') ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Better Here
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Starting EMI</p>
                <p className="mt-1 text-2xl font-bold text-[#0d3a5c]">{formatCurrency(scenario.initialEmi)}</p>
              </div>
              <div className={cn('rounded-2xl p-4', scenario.label === 'Fixed Rate' ? 'bg-slate-50/80 ring-1 ring-slate-200' : 'bg-white/10')}>
                <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', scenario.label === 'Fixed Rate' ? 'text-slate-400' : 'text-slate-300')}>Total Interest</p>
                <p className={cn('mt-1 text-2xl font-bold', scenario.label === 'Fixed Rate' ? 'text-[#0d3a5c]' : 'text-white')}>{formatLakhs(scenario.totalInterest)}</p>
              </div>
              <div className={cn('rounded-2xl p-4', scenario.label === 'Fixed Rate' ? 'bg-slate-50/80 ring-1 ring-slate-200' : 'bg-white/10')}>
                <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', scenario.label === 'Fixed Rate' ? 'text-slate-400' : 'text-slate-300')}>Loan Closed In</p>
                <p className={cn('mt-1 text-2xl font-bold', scenario.label === 'Fixed Rate' ? 'text-[#0d3a5c]' : 'text-white')}>
                  {Math.floor(scenario.monthsPaid / 12)}y {scenario.monthsPaid % 12}m
                </p>
              </div>
              <div className={cn('rounded-2xl p-4', scenario.label === 'Fixed Rate' ? 'bg-slate-50/80 ring-1 ring-slate-200' : 'bg-white/10')}>
                <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', scenario.label === 'Fixed Rate' ? 'text-slate-400' : 'text-slate-300')}>Total Outflow</p>
                <p className={cn('mt-1 text-2xl font-bold', scenario.label === 'Fixed Rate' ? 'text-[#0d3a5c]' : 'text-white')}>{formatLakhs(scenario.totalOutflow)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mb-12 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-8 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#144d78]/10">
            <BarChart3 className="h-4 w-4 text-[#1b6896]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#0d3a5c]">Early-Year Comparison Table</h3>
            <p className="mt-1 text-sm text-slate-500">Track how aggressively prepaying in the first few years changes each path.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm uppercase tracking-[0.18em] text-slate-400">
                <th className="px-6 py-4">Year</th>
                <th className="px-6 py-4">Fixed Balance</th>
                <th className="px-6 py-4">Floating Balance</th>
                <th className="px-6 py-4">Fixed Lead</th>
                <th className="px-6 py-4">Comment</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {Array.from({ length: Math.max(fixedScenario.yearlyBalances.length, floatingScenario.yearlyBalances.length) }, (_, index) => {
                const fixedYear = fixedScenario.yearlyBalances[index];
                const floatingYear = floatingScenario.yearlyBalances[index];
                const year = fixedYear?.year ?? floatingYear?.year ?? index + 1;
                const fixedBalance = fixedYear?.balance ?? 0;
                const floatingBalance = floatingYear?.balance ?? 0;
                const lead = floatingBalance - fixedBalance;
                return (
                  <tr key={year} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-[#0d3a5c]">Year {year}</td>
                    <td className="px-6 py-4 text-[#0d3a5c]">{formatLakhs(fixedBalance)}</td>
                    <td className="px-6 py-4 text-[#0d3a5c]">{formatLakhs(floatingBalance)}</td>
                    <td className={cn('px-6 py-4 font-semibold', lead > 0 ? 'text-green-600' : lead < 0 ? 'text-red-500' : 'text-slate-500')}>
                      {lead === 0 ? 'Even' : `${lead > 0 ? 'Fixed ahead by ' : 'Floating ahead by '}${formatLakhs(Math.abs(lead))}`}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {year <= aggressiveYears ? 'High-impact prepayment window' : year === resetAfterYears ? 'Floating reset assumed here' : 'Lower impact phase'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[#1b6896]" />
            <h4 className="text-lg font-bold text-[#0d3a5c]">Interest Difference</h4>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#144d78]">{formatLakhs(interestGap)}</p>
          <p className="mt-2 text-sm text-slate-500">Gap in total interest between the two paths.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-[#1b6896]" />
            <h4 className="text-lg font-bold text-[#0d3a5c]">Closure Time Gap</h4>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#144d78]">{Math.floor(timeGap / 12)}y {timeGap % 12}m</p>
          <p className="mt-2 text-sm text-slate-500">Difference in actual payoff time.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#1b6896]" />
            <h4 className="text-lg font-bold text-[#0d3a5c]">Decision Read</h4>
          </div>
          <p className="mt-3 text-lg font-bold text-[#144d78]">{winner === 'fixed' ? 'Fixed is buying useful protection' : 'Floating is still efficient'}</p>
          <p className="mt-2 text-sm text-slate-500">
            Fixed is only worth it here if it shields your high-impact prepayment years from a meaningful rate rise.
          </p>
        </div>
      </div>
    </>
  );
}
