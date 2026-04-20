import React, { useMemo, useState, useRef, useEffect } from 'react';
import { calculateEMI, generatePrepaymentAmortizationSchedule, calculateInvestmentBreakEven, generateInvestmentSchedule, formatCurrency, formatLakhs, formatExact } from './utils/loanCalculator';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, AreaChart, Area } from 'recharts';
import { ArrowDown, ArrowRight, Calendar, CheckCircle2, Clock, Coins, IndianRupee, Percent, PiggyBank, Sparkles, TrendingDown, Wallet, Zap } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatIndianNumber(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function PrepaymentCalc() {
  // Base Loan Details
  const [principalStr, setPrincipalStr] = useState('1,00,00,000');
  const [rateStr, setRateStr] = useState('8');
  const [tenureStr, setTenureStr] = useState('20');
  const [prepaymentStr, setPrepaymentStr] = useState('10,000');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'annually'>('monthly');
  const [enableStepUp, setEnableStepUp] = useState(false);
  const [stepUpStr, setStepUpStr] = useState('5,000');
  const [stepUpFrequency, setStepUpFrequency] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'annually'>('annually');

  const principal = Number(principalStr.replace(/\D/g, '')) || 0;
  const rate = parseFloat(rateStr) || 0;
  const tenureYears = Number(tenureStr) || 1;
  const months = tenureYears * 12;
  const prepaymentAmount = Number(prepaymentStr.replace(/\D/g, '')) || 0;
  const stepUpAmount = Number(stepUpStr.replace(/\D/g, '')) || 0;

  const frequencyDays = {
    daily: 1,
    weekly: 7,
    'bi-weekly': 14,
    monthly: 30,
    quarterly: 90,
    'half-yearly': 180,
    annually: 360
  }[frequency];

  const stepUpFrequencyDays = {
    daily: 1,
    weekly: 7,
    'bi-weekly': 14,
    monthly: 30,
    quarterly: 90,
    'half-yearly': 180,
    annually: 360
  }[stepUpFrequency];

  // Constraint: step up frequency should not be more frequent than prepayment frequency
  const isValidStepUp = stepUpFrequencyDays >= frequencyDays;

  // Auto-adjust step up frequency if it becomes invalid
  useEffect(() => {
    if (enableStepUp && !isValidStepUp) {
      // Find the next valid frequency (same or less frequent)
      const validFrequencies = Object.entries({
        daily: 1,
        weekly: 7,
        'bi-weekly': 14,
        monthly: 30,
        quarterly: 90,
        'half-yearly': 180,
        annually: 360
      }).filter(([key, days]) => days >= frequencyDays);
      
      if (validFrequencies.length > 0) {
        setStepUpFrequency(validFrequencies[0][0] as typeof stepUpFrequency);
      }
    }
  }, [frequency, isValidStepUp, enableStepUp]);

  // Calculations
  const emi = calculateEMI(principal, rate, months);
  const normalSchedule = generatePrepaymentAmortizationSchedule(principal, rate, emi, months, 0, frequencyDays, 0, stepUpFrequencyDays);
  const prepaymentSchedule = generatePrepaymentAmortizationSchedule(principal, rate, emi, months, prepaymentAmount, frequencyDays, enableStepUp ? stepUpAmount : 0, stepUpFrequencyDays);

  const normalTotalInterest = normalSchedule.length > 0 ? normalSchedule[normalSchedule.length - 1].interestPaid : 0;
  const prepaymentTotalInterest = prepaymentSchedule.length > 0 ? prepaymentSchedule[prepaymentSchedule.length - 1].interestPaid : 0;
  const interestSaved = normalTotalInterest - prepaymentTotalInterest;

  const normalTenureMonths = normalSchedule.length > 0 ? normalSchedule[normalSchedule.length - 1].month : months;
  const prepaymentTenureMonths = prepaymentSchedule.length > 0 ? prepaymentSchedule[prepaymentSchedule.length - 1].month : months;
  const monthsSaved = normalTenureMonths - prepaymentTenureMonths;

  const normalTotalMoneyOut = normalSchedule.length > 0 ? normalSchedule[normalSchedule.length - 1].totalEmis : 0;
  const prepaymentTotalMoneyOut = prepaymentSchedule.length > 0
    ? prepaymentSchedule[prepaymentSchedule.length - 1].totalEmis + prepaymentSchedule[prepaymentSchedule.length - 1].totalPrepayments
    : 0;

  const investmentBreakEven = calculateInvestmentBreakEven(
    principal,
    rate,
    emi,
    months,
    prepaymentAmount,
    frequencyDays,
    enableStepUp ? stepUpAmount : 0,
    stepUpFrequencyDays,
    12
  );

  const breakEvenYears = investmentBreakEven ? Math.floor(investmentBreakEven.day / 360) : 0;
  const breakEvenMonths = investmentBreakEven ? Math.ceil((investmentBreakEven.day % 360) / 30) : 0;

  const investmentSchedule = generateInvestmentSchedule(
    principal, rate, emi, months, prepaymentAmount, frequencyDays,
    enableStepUp ? stepUpAmount : 0, stepUpFrequencyDays, 12
  );

  // Chart data
  const chartData = useMemo(() => {
    const maxLength = Math.max(normalSchedule.length, prepaymentSchedule.length, investmentSchedule.length);
    return Array.from({ length: maxLength }, (_, i) => ({
      year: (i + 1),
      normal: normalSchedule[i]?.interestPaid || normalTotalInterest,
      prepayment: prepaymentSchedule[i]?.interestPaid || prepaymentTotalInterest,
      investmentCorpus: investmentSchedule[i]?.investmentValue || 0,
    }));
  }, [normalSchedule, prepaymentSchedule, investmentSchedule, normalTotalInterest, prepaymentTotalInterest]);

  return (
    <div className="space-y-8">
      {/* INPUTS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
      >
        <div className="flex gap-8 items-start">
        <div className="grid flex-1 max-w-[720px] grid-cols-1 gap-3 md:grid-cols-2">
          {/* Loan Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Loan Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={principalStr}
                onChange={(e) => setPrincipalStr(e.target.value.replace(/[^0-9,]/g, ''))}
                onBlur={() => setPrincipalStr(formatIndianNumber(principal))}
                className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] py-2 pl-8 pr-4 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
              />
            </div>
          </div>

          {/* Tenure */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Tenure
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={tenureStr}
                onChange={(e) => setTenureStr(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 pr-14 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">years</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Interest Rate
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 pr-10 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">%</span>
            </div>
          </div>

          {/* Prepayment Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Prepayment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={prepaymentStr}
                onChange={(e) => setPrepaymentStr(e.target.value.replace(/[^0-9,]/g, ''))}
                onBlur={() => setPrepaymentStr(formatIndianNumber(prepaymentAmount))}
                className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] py-2 pl-8 pr-4 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Prepayment Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half-Yearly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {/* Enable Step Up Checkbox */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableStepUp}
                onChange={(e) => setEnableStepUp(e.target.checked)}
                className="w-5 h-5 text-[#46b8c3] bg-gray-100 border-gray-300 rounded focus:ring-[#46b8c3] focus:ring-2"
              />
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Enable Step Up (Increase prepayment amount over time)
              </span>
            </label>
          </div>

          {/* Step Up Amount */}
          {enableStepUp && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step Up Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={stepUpStr}
                  onChange={(e) => setStepUpStr(e.target.value.replace(/[^0-9,]/g, ''))}
                  onBlur={() => setStepUpStr(formatIndianNumber(stepUpAmount))}
                  className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] py-2 pl-8 pr-4 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Step Up Frequency */}
          {enableStepUp && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step Up Frequency
              </label>
              <select
                value={stepUpFrequency}
                onChange={(e) => setStepUpFrequency(e.target.value as typeof stepUpFrequency)}
                className={`w-full rounded-2xl border bg-[#144d78]/[0.03] px-4 py-2 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white ${!isValidStepUp ? 'border-red-300' : 'border-slate-200'}`}
              >
                {Object.entries({
                  daily: 1,
                  weekly: 7,
                  'bi-weekly': 14,
                  monthly: 30,
                  quarterly: 90,
                  'half-yearly': 180,
                  annually: 360
                }).filter(([key, days]) => days >= frequencyDays).map(([key, days]) => (
                  <option key={key} value={key}>
                    {key === 'bi-weekly' ? 'Bi-Weekly' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </option>
                ))}
              </select>
              {!isValidStepUp && (
                <p className="text-xs text-red-600 mt-1">Step up frequency cannot be more frequent than prepayment frequency</p>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col items-center justify-center min-w-[180px] p-6 bg-[#144d78]/[0.03] rounded-2xl border border-slate-200">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Monthly EMI</span>
          <span className="text-3xl font-extrabold text-[#144d78]">{formatCurrency(emi)}</span>
        </div>
        </div>
      </motion.div>

      {/* HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-[#1b6896] to-[#2a85b5] rounded-3xl border border-[#2a85b5] shadow-2xl p-8 md:p-12 mb-10 text-center relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-[#46b8c3]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <p className="text-2xl md:text-3xl font-medium tracking-tight text-white/90 relative z-10">
          Paying <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46b8c3] to-[#8edce4] font-extrabold">{formatCurrency(prepaymentAmount)}</span> {frequency}
          {enableStepUp && (
            <>
              <br />
              <span className="text-lg md:text-xl">+ Step up <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46b8c3] to-[#8edce4] font-extrabold">{formatCurrency(stepUpAmount)}</span> {stepUpFrequency}</span>
            </>
          )} =
        </p>

        <p className="text-5xl md:text-7xl font-extrabold tracking-tight relative z-10 mt-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46b8c3] to-[#8edce4]">{formatCurrency(investmentBreakEven ? normalTotalMoneyOut - (investmentBreakEven.month * emi + investmentBreakEven.totalContributions - investmentBreakEven.surplusCorpus) : 0)} Saved.</span>
        </p>
      </motion.div>

      {/* RESULTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Normal Scenario */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200"
        >
          <h3 className="text-xl font-bold text-[#0d3a5c] mb-6">Without Prepayment</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base text-slate-500">Tenure</span>
              <span className="text-base font-semibold text-[#0d3a5c]">{Math.floor(normalTenureMonths / 12)} Yrs {normalTenureMonths % 12 > 0 ? `${normalTenureMonths % 12} Months` : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base text-slate-500">Total Outflow</span>
              <span className="text-base font-semibold text-[#0d3a5c]">{formatLakhs(normalTotalMoneyOut)}</span>
            </div>
          </div>
        </motion.div>

        {/* With Prepayment */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1b6896] rounded-3xl p-8 shadow-sm border border-[#2a85b5] text-white"
        >
          <h3 className="text-xl font-bold text-white mb-6">With Prepayment</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base text-slate-300">Tenure</span>
              <span className="text-base font-semibold text-white">{Math.floor(prepaymentTenureMonths / 12)} Yrs {prepaymentTenureMonths % 12 > 0 ? `${prepaymentTenureMonths % 12} Months` : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base text-slate-300">Total Outflow</span>
              <span className="text-base font-semibold text-white">{formatLakhs(prepaymentTotalMoneyOut)}</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-[#46b8c3]/10 rounded-2xl border border-[#46b8c3]/20">
            <p className="text-base font-semibold text-white uppercase tracking-wider mb-2">Amount Saved</p>
            <span className="text-2xl font-bold text-white">{formatCurrency(normalTotalMoneyOut - prepaymentTotalMoneyOut)}</span>
          </div>
          {monthsSaved > 0 && (
            <div className="mt-4 p-4 bg-[#46b8c3]/10 rounded-2xl border border-[#46b8c3]/20">
              <p className="text-base font-semibold text-white uppercase tracking-wider mb-2">Time Saved</p>
              <span className="text-2xl font-bold text-white">{Math.floor(monthsSaved / 12)} Years {monthsSaved % 12} Months</span>
            </div>
          )}

        </motion.div>

        {/* Invest Instead Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-gradient-to-br from-[#1a2d4d] to-[#2a4a7a] rounded-3xl p-8 shadow-sm border border-[#2a4a7a] text-white"
        >
          <h3 className="text-xl font-bold text-white mb-6">Invest Instead (12% p.a.)</h3>
          <div className="space-y-4">
            {investmentBreakEven ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-base text-slate-300">Tenure</span>
                  <span className="text-base font-semibold text-sky-300">
                    {breakEvenYears > 0 ? `${breakEvenYears} Yrs ` : ''}{breakEvenMonths} Months
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-slate-300">Total Outflow</span>
                  <span className="text-base font-semibold text-sky-300">{formatLakhs(investmentBreakEven.month * emi + investmentBreakEven.totalContributions - investmentBreakEven.surplusCorpus)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-base text-white/90">Investment won't exceed loan balance before scheduled completion</span>
              </div>
            )}
          </div>
          {investmentBreakEven && (
            <>
              <div className="mt-6 p-4 bg-sky-400/10 rounded-2xl border border-sky-400/20">
                <p className="text-base font-semibold text-sky-300 uppercase tracking-wider mb-2">Amount Saved</p>
                <span className="text-2xl font-bold text-sky-300">{formatCurrency(normalTotalMoneyOut - (investmentBreakEven.month * emi + investmentBreakEven.totalContributions - investmentBreakEven.surplusCorpus))}</span>
              </div>
              <div className="mt-4 p-4 bg-sky-400/10 rounded-2xl border border-sky-400/20">
                <p className="text-base font-semibold text-sky-300 uppercase tracking-wider mb-2">Time Saved</p>
                <span className="text-2xl font-bold text-sky-300">
                  {Math.floor((normalTenureMonths - investmentBreakEven.month) / 12)} Years {(normalTenureMonths - investmentBreakEven.month) % 12} Months
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* SENSITIVITY TABLE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#144d78]/10">
            <CheckCircle2 className="h-4 w-4 text-[#1b6896]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#0d3a5c]">Sensitivity Analysis</h3>
            <p className="text-sm text-slate-500 mt-1">Prepayment amount variations</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-4 px-3 text-center font-semibold uppercase tracking-[0.15em] text-slate-400 border border-slate-300">Prepayment</th>
                <th className="py-4 px-3 text-center font-semibold uppercase tracking-[0.15em] text-[#1b6896] bg-[#1b6896]/[0.08] border border-slate-300">Tenure (Prepay)</th>
                <th className="py-4 px-3 text-center font-semibold uppercase tracking-[0.15em] text-[#1b6896] bg-[#1b6896]/[0.08] border border-slate-300">Amount Saved (Prepay)</th>
                <th className="py-4 px-3 text-center font-semibold uppercase tracking-[0.15em] text-[#2a4a7a] bg-[#2a4a7a]/[0.12] border border-slate-300">Tenure (Invest)</th>
                <th className="py-4 px-3 text-center font-semibold uppercase tracking-[0.15em] text-[#2a4a7a] bg-[#2a4a7a]/[0.12] border border-slate-300">Amount Saved (Invest)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => {
                const factor = 0.75 + i * 0.05;
                const varAmount = Math.round(prepaymentAmount * factor);
                const varStepUp = enableStepUp ? Math.round(stepUpAmount * factor) : 0;
                const varSchedule = generatePrepaymentAmortizationSchedule(principal, rate, emi, months, varAmount, frequencyDays, varStepUp, stepUpFrequencyDays);
                const varTenureMonths = varSchedule.length > 0 ? varSchedule[varSchedule.length - 1].month : months;
                const varTotalOut = varSchedule.length > 0 ? varSchedule[varSchedule.length - 1].totalEmis + varSchedule[varSchedule.length - 1].totalPrepayments : 0;
                const varInvest = calculateInvestmentBreakEven(principal, rate, emi, months, varAmount, frequencyDays, varStepUp, stepUpFrequencyDays, 12);
                const varInvestTotalOut = varInvest ? varInvest.month * emi + varInvest.totalContributions : 0;
                const isCurrentRow = factor === 1.0;
                return (
                  <tr key={i} className={isCurrentRow ? 'bg-[#144d78]/[0.04]' : ''}>
                    <td className={`py-3 px-3 text-center font-medium border border-slate-300 ${isCurrentRow ? 'text-[#144d78] font-bold' : 'text-slate-600'}`}>{formatCurrency(varAmount)} {isCurrentRow ? '←' : ''}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#1b6896] bg-[#1b6896]/[0.08] border border-slate-300">{Math.floor(varTenureMonths / 12)} Yrs {varTenureMonths % 12 > 0 ? `${varTenureMonths % 12} Mo` : ''}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#1b6896] bg-[#1b6896]/[0.08] border border-slate-300">{formatCurrency(normalTotalMoneyOut - varTotalOut)}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#2a4a7a] bg-[#2a4a7a]/[0.12] border border-slate-300">{varInvest ? `${Math.floor(varInvest.day / 360) > 0 ? `${Math.floor(varInvest.day / 360)} Yrs ` : ''}${Math.ceil((varInvest.day % 360) / 30)} Mo` : '-'}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#2a4a7a] bg-[#2a4a7a]/[0.12] border border-slate-300">{varInvest ? formatCurrency(normalTotalMoneyOut - (varInvest.month * emi + varInvest.totalContributions - varInvest.surplusCorpus)) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CHART */}
      {/*<motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
      >
        <h3 className="text-xl font-bold text-[#0d3a5c] mb-6">Interest Accumulation Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => formatLakhs(value)} />
            <Tooltip formatter={(value: number) => [formatLakhs(value), '']} />
            <Area type="monotone" dataKey="normal" stackId="1" stroke="#46b8c3" fill="#46b8c3" fillOpacity={0.6} />
            <Area type="monotone" dataKey="prepayment" stackId="2" stroke="#1b6896" fill="#1b6896" fillOpacity={0.6} />
            <Area type="monotone" dataKey="investmentCorpus" stackId="3" stroke="#1a2d4d" fill="#1a2d4d" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#46b8c3] rounded"></div>
            <span className="text-sm text-slate-500">Without Prepayment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#1b6896] rounded"></div>
            <span className="text-sm text-slate-500">With Prepayment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#1a2d4d] rounded"></div>
            <span className="text-sm text-slate-500">Investment Corpus (12%)</span>
          </div>
        </div>
      </motion.div>*/}
    </div>
  );
}