/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef } from 'react';
import { calculateEMI, calculateTenure, generateAmortizationSchedule, formatCurrency, formatLakhs } from './utils/loanCalculator';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, AreaChart, Area } from 'recharts';

import { ArrowDown, ArrowRight, Calendar, CheckCircle2, Clock, Coins, IndianRupee, Percent, PiggyBank, Sparkles, TrendingDown, Wallet, Zap } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AmountCalc from './BasicAmountCalc';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatIndianNumber(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

function ScrollFadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function ChartReveal({ children, className }: { children: (inView: boolean) => React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      {children(isInView)}
    </motion.div>
  );
}

export default function App() {
  const [activeCalculator, setActiveCalculator] = useState<'refinance' | 'amount'>('refinance');
  
  // Base Loan Details (editable) — string state for free-form editing
  const [principalStr, setPrincipalStr] = useState('1,00,00,000');
  const [currentRateStr, setCurrentRateStr] = useState('8');
  const [newRateStr, setNewRateStr] = useState('7');
  const [tenureStr, setTenureStr] = useState('20');

  const principal = Number(principalStr.replace(/\D/g, '')) || 0;
  const currentRate = parseFloat(currentRateStr) || 0;
  const newRate = parseFloat(newRateStr) || 0;
  const tenureYears = Number(tenureStr) || 1;
  const currentMonths = tenureYears * 12;

  // Current Scenario Calculations
  const currentEmi = calculateEMI(principal, currentRate, currentMonths);
  const currentTotalInterest = (currentEmi * currentMonths) - principal;

  // Option 1: Lower EMI (Keep tenure same)
  const s1Emi = calculateEMI(principal, newRate, currentMonths);
  const s1TotalInterest = (s1Emi * currentMonths) - principal;
  const s1Savings = currentTotalInterest - s1TotalInterest;
  const s1MonthlySavings = currentEmi - s1Emi;

  // Option 2: Pay Faster (Keep EMI same)
  const s2RawMonths = calculateTenure(principal, newRate, currentEmi);
  const s2Months = isFinite(s2RawMonths) ? Math.ceil(s2RawMonths) : currentMonths;
  const s2TotalInterest = (currentEmi * s2Months) - principal;
  const s2Savings = currentTotalInterest - s2TotalInterest;
  const s2MonthsSaved = currentMonths - s2Months;

  // Generate rate drop scenarios (0.25% increments)
  const rateScenarios = useMemo(() => {
    const scenarios = [];
    for (let rate = currentRate - 0.25; rate >= currentRate - 1.5; rate -= 0.25) {
      // Option A: Lower EMI
      const optAEmi = calculateEMI(principal, rate, currentMonths);
      const optATotalInterest = (optAEmi * currentMonths) - principal;
      const optASavings = currentTotalInterest - optATotalInterest;
      const optAMonthlySavings = currentEmi - optAEmi;

      // Option B: Pay Faster
      const optBRaw = calculateTenure(principal, rate, currentEmi);
      const optBMonths = isFinite(optBRaw) ? Math.ceil(optBRaw) : currentMonths;
      const optBTotalInterest = (currentEmi * optBMonths) - principal;
      const optBSavings = currentTotalInterest - optBTotalInterest;
      const optBMonthsSaved = currentMonths - optBMonths;

      scenarios.push({
        rate,
        optAEmi,
        optAMonthlySavings,
        optASavings,
        optBMonths,
        optBMonthsSaved,
        optBSavings
      });
    }
    return scenarios;
  }, [principal, currentRate, currentMonths, currentEmi, currentTotalInterest]);

  // Amortization Schedules for Charts
  const currentSchedule = useMemo(() => generateAmortizationSchedule(principal, currentRate, currentEmi, currentMonths), [principal, currentRate, currentEmi, currentMonths]);
  const s1Schedule = useMemo(() => generateAmortizationSchedule(principal, newRate, s1Emi, currentMonths), [principal, newRate, s1Emi, currentMonths]);
  const s2Schedule = useMemo(() => generateAmortizationSchedule(principal, newRate, currentEmi, s2Months), [principal, newRate, currentEmi, s2Months]);


  const barChartData = [
    {
      name: `Current (${currentRate}%)`,
      Principal: principal,
      Interest: currentTotalInterest,
      Saved: 0,
    },
    {
      name: 'Reduce EMI',
      Principal: principal,
      Interest: s1TotalInterest,
      Saved: s1Savings,
    },
    {
      name: 'Reduce Tenure',
      Principal: principal,
      Interest: s2TotalInterest,
      Saved: s2Savings,
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0d3a5c] font-['Poppins',sans-serif] selection:bg-[#46b8c3]/30 pb-20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* <div className="sticky top-0 z-50 bg-[#fafafa]/80 backdrop-blur-md pt-4 pb-2">
          <div className="inline-flex rounded-2xl bg-slate-200/60 p-1">
            {([['refinance', 'Rate Reset'], ['amount', 'Amount Calculator']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCalculator(key)}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-semibold transition-all',
                  activeCalculator === key
                    ? 'bg-[#144d78] text-white shadow-sm'
                    : 'text-slate-500 hover:text-[#144d78]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div> */}
        <div className="pt-4">
          <h1 className="text-3xl font-bold tracking-tight text-[#0d3a5c]">
            {activeCalculator === 'refinance' ? 'Savings on Rate Reduction' : 'Loan Eligibility Calculator'}
          </h1>
        </div>
        {true ? (
          <>
            {/* LOAN INPUTS + SNAPSHOT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-6 mb-8"
            >
          
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div>
            <div className="grid max-w-[720px] grid-cols-1 gap-3 md:grid-cols-2">
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

            

            {/* Current Rate */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Current Rate
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={currentRateStr}
                  onChange={(e) => setCurrentRateStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 pr-10 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1b6896]/40 font-semibold text-base">%</span>
              </div>
            </div>

            {/* New Rate */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  New Rate
                </label>
                <span
                  className={cn(
                    'text-xs font-medium',
                    newRate < currentRate ? 'text-[#46b8c3]' : newRate > currentRate ? 'text-amber-600' : 'text-slate-400'
                  )}
                >
                  {newRate < currentRate
                    ? `${(currentRate - newRate).toFixed(1)}% drop`
                    : newRate > currentRate
                      ? `${(newRate - currentRate).toFixed(1)}% increase`
                      : '0.0% change'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={newRateStr}
                  onChange={(e) => setNewRateStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full rounded-2xl border border-[#46b8c3]/30 bg-[#46b8c3]/[0.06] px-4 py-2 pr-10 text-lg font-bold text-[#1b6896] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#46b8c3]/50 font-semibold text-base">%</span>
              </div>
              <p className="hidden">
                {currentRate > newRate ? `↓ ${(currentRate - newRate).toFixed(1)}% drop` : '\u00A0'}
              </p>
            </div>
            </div>
            </div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
              className="self-start rounded-3xl border border-slate-300/80 bg-slate-100/75 p-4"
            >
              <motion.div variants={staggerItem}>
                <div className="rounded-2xl bg-white/96 px-4 py-3 ring-1 ring-slate-300/80">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Monthly EMI</p>
                    <p className="text-lg font-bold tracking-tight text-[#0b3453]">{formatCurrency(currentEmi)}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div variants={staggerItem}>
                <div className="mt-3 rounded-2xl bg-white/96 px-4 py-3 ring-1 ring-slate-300/80">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Total Interest</p>
                    <p className="text-lg font-bold tracking-tight text-[#0b3453]">{formatLakhs(currentTotalInterest)}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
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
            A <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46b8c3] to-[#8edce4] font-extrabold">{parseFloat((currentRate - newRate).toFixed(2))}%</span> Interest Rate Cut =
          </p>
          
          <p className="text-5xl md:text-7xl font-extrabold tracking-tight relative z-10 mt-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46b8c3] to-[#8edce4]">{formatLakhs(s2Savings)} Saved.</span>
          </p>
        </motion.div>

        {/* THE TWO STRATEGIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Strategy A: Lower EMI */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 group relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Coins className="w-32 h-32" />
            </div>
            
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#46b8c3]/10 text-[#1b6896] text-base font-semibold text-[#1b6896]">
                Reduce EMI Keeping Tenure Same
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-[#0d3a5c] mb-2 relative z-10">More Cash Monthly</h3>
            <p className="text-base text-slate-500 mb-8 relative z-10">Keep your {tenureYears}-year timeline, but reduce your monthly out-of-pocket expense.</p>
            
            <div className="bg-gradient-to-br from-[#46b8c3]/15 to-[#46b8c3]/5 rounded-2xl p-6 mb-4 border border-[#46b8c3]/30 relative z-10">
              <p className="text-base font-semibold text-[#144d78] uppercase tracking-wider mb-2">Total Saved</p>
              <span className="text-4xl font-bold text-[#46b8c3] tracking-tight">{formatLakhs(s1Savings)}</span>
            </div>

            <div className="bg-[#46b8c3]/10 rounded-2xl p-6 mb-8 border border-[#46b8c3]/20 relative z-10">
              <p className="text-base font-semibold text-[#144d78] uppercase tracking-wider mb-2">Monthly Savings</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-[#46b8c3] tracking-tight">{formatCurrency(s1MonthlySavings)}</span>
                <span className="text-base text-[#1b6896] font-medium mb-0.5">/ mo</span>
              </div>
            </div>

            <div className="space-y-4 mt-auto relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-base text-slate-500 flex items-center gap-2"><IndianRupee className="w-5 h-5"/> EMI</span>
                <span className="text-base font-semibold text-[#0d3a5c]">{formatCurrency(s1Emi)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-base text-slate-500 flex items-center gap-2"><Clock className="w-5 h-5"/> Tenure</span>
                <span className="text-base font-semibold text-[#0d3a5c]">{tenureYears} Years <span className="text-slate-400 font-normal">(Same)</span></span>
              </div>
            </div>
          </motion.div>

          {/* Strategy B: Pay Faster (Recommended) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#1b6896] rounded-3xl p-8 shadow-sm border border-[#2a85b5] hover:shadow-lg transition-shadow duration-300 group relative overflow-hidden flex flex-col text-white"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-32 h-32 text-[#46b8c3]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1b6896]/30 to-transparent pointer-events-none"></div>
            
            <div className="mb-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#46b8c3]/20 text-[#46b8c3] text-base font-semibold border border-[#46b8c3]/30">
                Reduce Tenure Keeping EMI Same
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Debt-Free Faster</h3>
            <p className="text-base text-slate-400 mb-8 relative z-10">Keep paying your current EMI amount, and watch your loan vanish years earlier.</p>
            
            <div className="bg-gradient-to-br from-[#46b8c3]/20 to-[#46b8c3]/5 rounded-2xl p-6 mb-4 border border-[#46b8c3]/30 relative z-10 backdrop-blur-sm">
              <p className="text-base font-semibold text-[#46b8c3] uppercase tracking-wider mb-2">Total Saved</p>
              <span className="text-4xl font-bold text-[#46b8c3] tracking-tight">{formatLakhs(s2Savings)}</span>
            </div>

            <div className="bg-[#46b8c3]/10 rounded-2xl p-6 mb-8 border border-[#46b8c3]/20 relative z-10 backdrop-blur-sm">
              <p className="text-base font-semibold text-[#46b8c3] uppercase tracking-wider mb-2">Time Saved</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-[#46b8c3] tracking-tight">{Math.floor(s2MonthsSaved / 12)}<span className="text-2xl">y</span> {s2MonthsSaved % 12}<span className="text-2xl">m</span></span>
                <span className="text-base text-[#46b8c3] font-medium mb-0.5">earlier</span>
              </div>
            </div>

            <div className="space-y-4 mt-auto relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-base text-slate-300 flex items-center gap-2"><IndianRupee className="w-5 h-5"/> EMI</span>
                <span className="text-base font-semibold text-white">{formatCurrency(currentEmi)} <span className="text-slate-400 font-normal">(Same)</span></span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-base text-slate-300 flex items-center gap-2"><Clock className="w-5 h-5"/> Tenure</span>
                <span className="text-base font-semibold text-white">{Math.floor(s2Months / 12)} Years {s2Months % 12} mo</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* VISUAL PROOF (Charts) */}
        <ScrollFadeIn className="mb-10">
          <div>
            {/* Total Payment Breakdown Chart */}
            <ChartReveal className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              {(inView) => (<>
              <h3 className="text-2xl font-bold text-[#0d3a5c] mb-2">Total Money Outflow</h3>
              <p className="text-base text-slate-500 mb-6">See how Principal, Interest & Savings stack up</p>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inView ? barChartData : []} margin={{ top: 30, right: 10, left: 10, bottom: 10 }} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins' }} dy={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Poppins' }}
                      tickFormatter={(value) => formatLakhs(value)}
                      width={70}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 min-w-[200px]">
                            <p className="font-bold text-[#0d3a5c] text-base mb-3">{label}</p>
                            <div className="space-y-1.5 text-base">
                              <div className="flex justify-between gap-6">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1b6896] inline-block"></span>Principal</span>
                                <span className="font-semibold text-[#1b6896]">{formatLakhs(d.Principal)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#46b8c3] inline-block"></span>Interest</span>
                                <span className="font-semibold text-[#46b8c3]">{formatLakhs(d.Interest)}</span>
                              </div>
                              {d.Saved > 0 && (
                                <div className="flex justify-between gap-6">
                                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: 'rgba(13,58,92,0.3)' }}></span>You Save</span>
                                  <span className="font-bold" style={{ color: 'rgba(13,58,92,0.5)' }}>{formatLakhs(d.Saved)}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-6 pt-1.5 mt-1 border-t border-slate-100">
                                <span className="font-medium text-[#0d3a5c]">Total Paid</span>
                                <span className="font-bold text-[#0d3a5c]">{formatLakhs(d.Principal + d.Interest)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 500, fontFamily: 'Poppins' }}
                      formatter={(value: string) => <span style={{ color: value === 'Principal' ? '#0d3a5c' : value === 'Interest' ? '#1b6896' : '#46b8c3' }}>{value}</span>}
                      payload={[
                        { value: 'Principal', type: 'circle', color: '#0d3a5c' },
                        { value: 'Interest', type: 'circle', color: '#1b6896' },
                        { value: 'You Save', type: 'circle', color: '#46b8c3' },
                      ]}
                    />
                    <Bar dataKey="Principal" name="Principal" stackId="a" fill="#0d3a5c" radius={[0, 0, 8, 8]}
                      label={({ x, y, width, height, index }: any) => {
                        const d = barChartData[index];
                        if (d.Saved <= 0) return null;
                        const totalHeight = height * (d.Principal + d.Interest + d.Saved) / d.Principal;
                        const topY = y + height - totalHeight;
                        return (
                          <text x={x + width / 2} y={topY - 10} textAnchor="middle" fill="#0d3a5c" fontSize={12} fontWeight={700} fontFamily="Poppins">
                            Save {formatLakhs(d.Saved)}
                          </text>
                        );
                      }}
                    />
                    <Bar dataKey="Interest" name="Interest" stackId="a" fill="#1b6896">
                      {barChartData.map((d, index) => (
                        <Cell key={`interest-${index}`} radius={d.Saved <= 0 ? [8, 8, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </Bar>
                    <Bar dataKey="Saved" name="You Save" stackId="a" fill="#46b8c3" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </>)}
            </ChartReveal>

          </div>

        </ScrollFadeIn>



        {/* RATE DROP SCENARIOS (0.25% Increments) */}
        <ScrollFadeIn className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div>
              <h3 className="text-2xl font-bold text-[#0d3a5c]">Rate Drop Scenarios</h3>
              <p className="text-base text-slate-500 mt-1">See how every 0.25% drop impacts your loan</p>
            </div>
          </div>

          {/* Rate Drop Chart */}
          <ChartReveal className="p-8 border-b border-slate-100">
            {(inView) => (<>
            <h4 className="text-base font-semibold text-[#0d3a5c] mb-2 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#1b6896]/50" />
              Total Savings Comparison
            </h4>
            <p className="text-base text-slate-400 mb-6">Savings at each rate increment</p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inView ? rateScenarios : []} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="rate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'Poppins' }} 
                    tickFormatter={(val) => `${val.toFixed(2)}%`} 
                    dy={10} 
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Poppins' }}
                    tickFormatter={(value) => formatLakhs(value)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Interest Rate: ${Number(label).toFixed(2)}%`}
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Poppins' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 500, fontFamily: 'Poppins' }} />
                  <Bar dataKey="optASavings" name="Reduce EMI" fill="#46b8c3" radius={[4, 4, 4, 4]} maxBarSize={40} />
                  <Bar dataKey="optBSavings" name="Reduce Tenure" fill="#1b6896" radius={[4, 4, 4, 4]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </>)}
          </ChartReveal>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 text-base text-slate-400 uppercase tracking-wider font-semibold">
                  <th rowSpan={2} className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 text-center align-bottom">Rate</th>
                  <th colSpan={3} className="px-5 py-3 text-center text-[#1b6896] bg-[#46b8c3]/10 border-l border-slate-100">Reduce EMI</th>
                  <th colSpan={3} className="px-5 py-3 text-center text-[#144d78] bg-[#1b6896]/10 border-l border-slate-100">Reduce Tenure</th>
                </tr>
                <tr className="border-b border-slate-200 text-base text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="px-5 py-2.5 text-center bg-[#46b8c3]/10 border-l border-slate-100">New EMI</th>
                  <th className="px-5 py-2.5 text-center bg-[#46b8c3]/10">Monthly Savings</th>
                  <th className="px-5 py-2.5 text-center bg-[#46b8c3]/10">Total Saved</th>
                  <th className="px-5 py-2.5 text-center bg-[#1b6896]/10 border-l border-slate-100">New Tenure</th>
                  <th className="px-5 py-2.5 text-center bg-[#1b6896]/10">Time Saved</th>
                  <th className="px-5 py-2.5 text-center bg-[#1b6896]/10">Total Saved</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {rateScenarios.map((scenario, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-center font-bold text-[#144d78] bg-slate-50/20 text-base">
                      {scenario.rate.toFixed(2)}%
                    </td>
                    <td className="px-5 py-4 text-center bg-[#46b8c3]/5 border-l border-slate-100 font-semibold text-[#0d3a5c]">{formatCurrency(scenario.optAEmi)}</td>
                    <td className="px-5 py-4 text-center bg-[#46b8c3]/5 font-semibold text-[#1b6896]">+{formatCurrency(scenario.optAMonthlySavings)}</td>
                    <td className="px-5 py-4 text-center bg-[#46b8c3]/5 font-bold text-[#1b6896]">{formatLakhs(scenario.optASavings)}</td>
                    <td className="px-5 py-4 text-center bg-[#1b6896]/5 border-l border-slate-100 font-semibold text-[#0d3a5c]">{Math.floor(scenario.optBMonths / 12)}y {scenario.optBMonths % 12}m</td>
                    <td className="px-5 py-4 text-center bg-[#1b6896]/5 font-semibold text-[#1b6896]">{Math.floor(scenario.optBMonthsSaved / 12)}y {scenario.optBMonthsSaved % 12}m early</td>
                    <td className="px-5 py-4 text-center bg-[#1b6896]/5 font-bold text-[#144d78]">{formatLakhs(scenario.optBSavings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollFadeIn>
        </>
        ) : null /* <AmountCalc /> */}
      </main>
    </div>
  );
}

// Helper icon component
function PieChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}
