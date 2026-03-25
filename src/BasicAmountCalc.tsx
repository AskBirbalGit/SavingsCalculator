import React, { useMemo, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ScrollFadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
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

const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
const fmtLakhs = (n: number) =>
  n >= 10000000 ? `Rs. ${(n / 10000000).toFixed(2)} Cr` : `Rs. ${(n / 100000).toFixed(2)} L`;
const fmtIndian = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const parseIndian = (s: string) => Number(s.replace(/\D/g, '')) || 0;

const getFOIR = (income: number): number => {
  if (income < 50000) return 0.4;
  if (income < 100000) return 0.5;
  if (income < 200000) return 0.55;
  return 0.6;
};

const getLTV = (propertyValue: number): number => {
  if (propertyValue <= 3000000) return 0.9;
  if (propertyValue <= 7500000) return 0.8;
  return 0.75;
};

const getLTVPremium = (ltv: number): number => {
  if (ltv <= 0.6) return -0.1;
  if (ltv <= 0.75) return 0;
  if (ltv <= 0.8) return 0.25;
  return 0.5;
};

const getBaseRate = (score: number): { rate: number; band: string } => {
  if (score >= 800) return { rate: 7.25, band: '800+' };
  if (score >= 775) return { rate: 7.5, band: '775-799' };
  if (score >= 750) return { rate: 7.75, band: '750-774' };
  if (score >= 725) return { rate: 8.1, band: '725-749' };
  if (score >= 700) return { rate: 8.5, band: '700-724' };
  if (score >= 675) return { rate: 8.95, band: '675-699' };
  if (score >= 650) return { rate: 9.5, band: '650-674' };
  return { rate: 10.25, band: 'Below 650' };
};

const getCIBILAdjustment = (score: number): { factor: number; label: string; color: string } => {
  if (score >= 800) return { factor: 1.05, label: '+5% (Excellent)', color: 'text-green-600' };
  if (score >= 750) return { factor: 1, label: 'No change (Good)', color: 'text-blue-600' };
  if (score >= 700) return { factor: 0.95, label: '-5% (Fair)', color: 'text-amber-600' };
  if (score >= 650) return { factor: 0.85, label: '-15% (Below Avg)', color: 'text-orange-600' };
  return { factor: 0, label: 'High Risk - Not Eligible', color: 'text-red-500' };
};

const emiToLoan = (emi: number, annualRate: number, months: number): number => {
  const r = annualRate / 12 / 100;
  if (r === 0) return emi * months;
  return (emi * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
};

type Employment = 'salaried' | 'self-employed' | 'professional';
type AssessmentMethod = 'itr' | 'adb' | 'gst-turnover';

const RETIREMENT_AGE: Record<Employment, number> = { salaried: 60, 'self-employed': 60, professional: 65 };
const MAX_TENURE: Record<Employment, number> = { salaried: 30, 'self-employed': 20, professional: 30 };

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1b6896]/40">Rs.</span>
      <input
        type="text"
        inputMode="numeric"
        value={fmtIndian(value)}
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-slate-200 bg-[#144d78]/[0.03] px-4 py-2 pr-14 text-lg font-bold text-[#144d78] outline-none transition-all focus:border-[#46b8c3] focus:bg-white"
      />
      {suffix ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1b6896]/40">{suffix}</span> : null}
    </div>
  );
}

function SummaryRow({ label, value, accent = false, dark = true }: { label: string; value: string; accent?: boolean; dark?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-3 last:border-b-0 last:pb-0', dark ? 'border-b border-white/10' : 'border-b border-slate-100')}>
      <span className={cn('text-sm', dark ? 'text-slate-300' : 'text-slate-500')}>{label}</span>
      <span className={cn('text-right text-sm font-semibold', accent ? (dark ? 'text-[#8edce4]' : 'text-[#144d78]') : dark ? 'text-white' : 'text-[#0d3a5c]')}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#0d3a5c]">{value}</p>
    </div>
  );
}

export default function BasicAmountCalc() {
  const [employment, setEmployment] = React.useState<Employment>('salaried');
  const [assessmentMethod, setAssessmentMethod] = React.useState<AssessmentMethod>('itr');
  const [monthlySalary, setMonthlySalary] = React.useState(100000);
  const [itrMonthlyIncomeInput, setItrMonthlyIncomeInput] = React.useState(100000);
  const [gstAnnualSales, setGstAnnualSales] = React.useState(5000000);
  const [turnoverFactor, setTurnoverFactor] = React.useState(12);
  const [avgBankBalance, setAvgBankBalance] = React.useState(500000);
  const [adbFactor, setAdbFactor] = React.useState(27);
  const [recognitionRate, setRecognitionRate] = React.useState(100);
  const [age, setAge] = React.useState(30);
  const [cibil, setCibil] = React.useState(760);
  const [propertyValue, setPropertyValue] = React.useState(5000000);
  const [loanApplied, setLoanApplied] = React.useState(4000000);
  const [obligations, setObligations] = React.useState(10000);
  const [rateOverride, setRateOverride] = React.useState(false);
  const [customRate, setCustomRate] = React.useState(8.5);
  const [foirOverride, setFoirOverride] = React.useState(false);
  const [customFOIR, setCustomFOIR] = React.useState(50);
  const [showParameters, setShowParameters] = React.useState(false);

  const itrMonthlyIncome = itrMonthlyIncomeInput;
  const gstMonthlyIncome = (gstAnnualSales * (Math.min(Math.max(turnoverFactor, 10), 15) / 100)) / 12;
  const adbMonthlyIncome = avgBankBalance * (Math.min(Math.max(adbFactor, 25), 30) / 100);
  const derivedMonthlyIncome =
    employment === 'salaried'
      ? monthlySalary
      : assessmentMethod === 'itr'
        ? itrMonthlyIncome
        : assessmentMethod === 'gst-turnover'
          ? gstMonthlyIncome
          : adbMonthlyIncome;

  const recognisedIncome = derivedMonthlyIncome * ((employment === 'salaried' ? 100 : recognitionRate) / 100);
  const retirementAge = RETIREMENT_AGE[employment];
  const ageError = age < 21 ? 'Minimum age is 21.' : age >= retirementAge ? `Age must be below ${retirementAge} for ${employment}.` : null;
  const cibilRate = getBaseRate(cibil);
  const cibilAdj = getCIBILAdjustment(cibil);
  const slabFOIR = employment === 'self-employed' ? Math.max(getFOIR(recognisedIncome) - 0.05, 0.35) : getFOIR(recognisedIncome);
  const interestRate = rateOverride ? customRate : cibilRate.rate;
  const effectiveFOIR = foirOverride ? customFOIR / 100 : slabFOIR;
  const primaryIncomeLabel =
    employment === 'salaried'
      ? 'Monthly Salary Received'
      : assessmentMethod === 'itr'
        ? 'Average Monthly Business Income'
        : assessmentMethod === 'gst-turnover'
          ? 'Annual GST Sales'
          : 'Average Bank Balance';
  const primaryIncomeHint =
    employment === 'salaried'
      ? `${fmtLakhs(monthlySalary * 12)} / year`
      : assessmentMethod === 'itr'
        ? 'Quick estimate input. Recognition and overrides apply below.'
        : assessmentMethod === 'gst-turnover'
          ? `Using ${turnoverFactor}% turnover factor gives ${fmt(gstMonthlyIncome)} / month`
          : `Using ${adbFactor}% conversion gives ${fmt(adbMonthlyIncome)} / month`;

  const results = useMemo(() => {
    if (ageError) return null;
    const maxEMI = recognisedIncome * effectiveFOIR;
    const netEMI = maxEMI - obligations;
    if (netEMI <= 0) return { eligible: false as const, maxEMI, netEMI, foirRate: effectiveFOIR };

    const remainingYears = RETIREMENT_AGE[employment] - age;
    const tenureYears = Math.min(remainingYears, MAX_TENURE[employment]);
    const tenureMonths = tenureYears * 12;
    const ltvSlab = getLTV(propertyValue);
    const loanByLTV = propertyValue * ltvSlab;
    const actualLTV = propertyValue > 0 ? loanApplied / propertyValue : 0;
    const effectiveRate = interestRate + getLTVPremium(Math.min(actualLTV, ltvSlab));
    const loanFromEMI = emiToLoan(netEMI, effectiveRate, tenureMonths);
    if (cibilAdj.factor === 0) return { eligible: false as const, maxEMI, netEMI, foirRate: effectiveFOIR, cibilAdj };

    const preCreditLoan = Math.min(loanFromEMI, loanByLTV, loanApplied);
    const finalLoan = preCreditLoan * cibilAdj.factor;
    return {
      eligible: true as const,
      foirRate: effectiveFOIR,
      maxEMI,
      netEMI,
      tenureYears,
      tenureMonths,
      loanByLTV,
      loanFromEMI,
      actualLTV,
      ltvSlab,
      effectiveRate,
      preCreditLoan,
      finalLoan,
      cibilAdj,
    };
  }, [age, ageError, cibilAdj, effectiveFOIR, employment, interestRate, loanApplied, obligations, propertyValue, recognisedIncome]);

  const summaryRows = [
    { label: 'Employment', value: employment === 'self-employed' ? 'Self-Employed' : employment === 'professional' ? 'Professional' : 'Salaried' },
    { label: 'Income Considered', value: `${fmt(derivedMonthlyIncome)} / mo` },
    { label: 'Recognised Income', value: `${fmt(recognisedIncome)} / mo` },
    { label: 'Age / CIBIL', value: `${age} yrs / ${cibil}` },
    { label: 'Property / Request', value: `${fmtLakhs(propertyValue)} / ${fmtLakhs(loanApplied)}` },
  ];

  const calculationSteps = results?.eligible
    ? [
        {
          s: '1',
          l: 'Income Considered',
          v: fmt(derivedMonthlyIncome),
          d:
            employment === 'salaried'
              ? 'Direct monthly salary used for the estimate.'
              : assessmentMethod === 'itr'
                ? 'Average monthly business income entered directly for the quick estimate.'
                : assessmentMethod === 'gst-turnover'
                  ? `${fmtLakhs(gstAnnualSales)} annual GST sales converted using ${turnoverFactor}%.`
                  : `${fmt(avgBankBalance)} average bank balance converted using ${adbFactor}%.`,
        },
        {
          s: '2',
          l: 'Recognised Income',
          v: fmt(recognisedIncome),
          d: employment === 'salaried' ? 'No recognition haircut applied for salaried borrowers.' : `${fmt(derivedMonthlyIncome)} multiplied by ${recognitionRate}% recognition.`,
        },
        {
          s: '3',
          l: 'FOIR Applied',
          v: `${(results.foirRate * 100).toFixed(0)}%`,
          d: foirOverride ? `Manual FOIR override applied at ${customFOIR}%.` : 'Auto FOIR applied from the income slab and borrower type.',
        },
        {
          s: '4',
          l: 'Net EMI Capacity',
          v: fmt(results.netEMI),
          d: `${fmt(results.maxEMI)} minus ${fmt(obligations)} existing obligations.`,
        },
        {
          s: '5',
          l: 'Maximum Tenure',
          v: `${results.tenureYears} years`,
          d: `Minimum of retirement runway and product cap for ${employment}.`,
        },
        {
          s: '6',
          l: 'Effective Interest Rate',
          v: `${results.effectiveRate.toFixed(2)}%`,
          d: `${interestRate.toFixed(2)}% base rate adjusted for requested LTV.`,
        },
        {
          s: '7',
          l: 'Loan By EMI',
          v: fmt(results.loanFromEMI),
          d: 'Loan amount derived from EMI affordability using the standard amortization formula.',
        },
        {
          s: '8',
          l: 'Loan By LTV',
          v: fmt(results.loanByLTV),
          d: `${fmtLakhs(propertyValue)} property value capped at ${(results.ltvSlab * 100).toFixed(0)}% LTV.`,
        },
        {
          s: '9',
          l: 'Final Eligible Loan',
          v: fmt(results.finalLoan),
          d: `Lowest underwriting cap adjusted by CIBIL multiplier ${results.cibilAdj.factor}.`,
        },
      ]
    : [];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Applicant Profile</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {([
                    { value: 'salaried', label: 'Salaried' },
                    { value: 'self-employed', label: 'Self-Employed' },
                    { value: 'professional', label: 'Professional' },
                  ] as { value: Employment; label: string }[]).map((item) => (
                    <button key={item.value} onClick={() => setEmployment(item.value)} className={cn('rounded-2xl border px-4 py-3 text-sm font-semibold transition-all', employment === item.value ? 'border-[#144d78] bg-[#144d78] text-white' : 'border-slate-200 bg-slate-50/70 text-[#0d3a5c] hover:border-[#46b8c3] hover:bg-white')}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {employment !== 'salaried' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Business Income Method</label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {([
                      { value: 'itr', label: 'ITR / P&L' },
                      { value: 'adb', label: 'Average Bank Balance' },
                      { value: 'gst-turnover', label: 'GST Sales' },
                    ] as { value: AssessmentMethod; label: string }[]).map((item) => (
                      <button key={item.value} onClick={() => setAssessmentMethod(item.value)} className={cn('rounded-2xl border px-4 py-3 text-sm font-semibold transition-all', assessmentMethod === item.value ? 'border-[#1b6896] bg-[#1b6896] text-white' : 'border-slate-200 bg-[#46b8c3]/[0.04] text-[#1b6896] hover:border-[#46b8c3]')}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className={cn(employment !== 'salaried' && assessmentMethod === 'itr' ? 'xl:col-span-1' : '')}>
                  <label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{primaryIncomeLabel}</label>
                  {employment === 'salaried' ? <MoneyInput value={monthlySalary} onChange={setMonthlySalary} /> : null}
                  {employment !== 'salaried' && assessmentMethod === 'itr' ? <MoneyInput value={itrMonthlyIncomeInput} onChange={setItrMonthlyIncomeInput} /> : null}
                  {employment !== 'salaried' && assessmentMethod === 'gst-turnover' ? <MoneyInput value={gstAnnualSales} onChange={setGstAnnualSales} /> : null}
                  {employment !== 'salaried' && assessmentMethod === 'adb' ? <MoneyInput value={avgBankBalance} onChange={setAvgBankBalance} /> : null}
                  <p className="mt-2 pl-1 text-xs font-medium text-slate-500">{primaryIncomeHint}</p>
                </div>
                <div><label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Applicant Age</label><NumberInput value={age} onChange={setAge} suffix="yrs" min={21} max={75} /></div>
                <div><label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Credit Score (CIBIL)</label><NumberInput value={cibil} onChange={setCibil} min={300} max={900} /></div>
                <div><label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Property Market Value</label><MoneyInput value={propertyValue} onChange={setPropertyValue} /></div>
                <div><label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Requested Loan Amount</label><MoneyInput value={loanApplied} onChange={setLoanApplied} /></div>
                <div><label className="mb-1.5 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Current Monthly Obligations</label><MoneyInput value={obligations} onChange={setObligations} /></div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <button
                  onClick={() => setShowParameters((value) => !value)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Relevant Parameters</p>
                    <p className="mt-1 text-sm text-slate-500">Using defaults until changed</p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#46b8c3]">
                      {showParameters ? 'Collapse' : 'Expand'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-[#1b6896] transition-transform', showParameters ? 'rotate-180' : '')} />
                  </div>
                </button>

                {showParameters ? (
                  <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {employment !== 'salaried' && assessmentMethod === 'gst-turnover' ? (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Turnover Factor</label>
                        <NumberInput value={turnoverFactor} onChange={setTurnoverFactor} suffix="%" min={10} max={15} />
                      </div>
                    ) : null}

                    {employment !== 'salaried' && assessmentMethod === 'adb' ? (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ADB Conversion Factor</label>
                        <NumberInput value={adbFactor} onChange={setAdbFactor} suffix="%" min={25} max={30} />
                      </div>
                    ) : null}

                    {employment !== 'salaried' ? (
                      <div>
                        <div className="mb-1.5 flex h-[28px] items-center justify-between gap-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Income Recognition Rate</label>
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold opacity-0 select-none">
                            Auto
                          </span>
                        </div>
                        <NumberInput value={recognitionRate} onChange={setRecognitionRate} suffix="%" min={1} max={100} />
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-1.5 flex h-[28px] items-center justify-between gap-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Interest Rate</label>
                        <button onClick={() => setRateOverride((value) => !value)} className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all', rateOverride ? 'bg-[#144d78] text-white' : 'bg-slate-200 text-slate-600')}>
                          {rateOverride ? 'Manual' : 'Auto'}
                        </button>
                      </div>
                      <NumberInput value={rateOverride ? customRate : cibilRate.rate} onChange={rateOverride ? setCustomRate : () => undefined} suffix="%" step={0.05} />
                    </div>

                    <div>
                      <div className="mb-1.5 flex h-[28px] items-center justify-between gap-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">FOIR</label>
                        <button onClick={() => setFoirOverride((value) => !value)} className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all', foirOverride ? 'bg-[#144d78] text-white' : 'bg-slate-200 text-slate-600')}>
                          {foirOverride ? 'Manual' : 'Auto'}
                        </button>
                      </div>
                      <NumberInput value={foirOverride ? customFOIR : Number((slabFOIR * 100).toFixed(0))} onChange={foirOverride ? setCustomFOIR : () => undefined} suffix="%" min={1} max={100} />
                    </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Income Used</p>
                      <p className="mt-1 text-lg font-bold text-[#0d3a5c]">{fmt(derivedMonthlyIncome)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employment === 'salaried'
                          ? 'Direct monthly salary'
                          : assessmentMethod === 'itr'
                            ? 'Quick business income input'
                            : assessmentMethod === 'gst-turnover'
                              ? 'Derived from GST sales'
                              : 'Derived from bank balance'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recognised Income</p>
                      <p className="mt-1 text-lg font-bold text-[#0d3a5c]">{fmt(recognisedIncome)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employment === 'salaried' ? 'No haircut applied' : `After ${recognitionRate}% recognition`}
                      </p>
                    </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative mb-10 overflow-hidden rounded-3xl border border-[#1b6896] bg-gradient-to-br from-[#144d78] to-[#1b6896] p-8 text-center shadow-2xl md:p-12">
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/2 rounded-full bg-[#46b8c3]/10 blur-3xl" />
        {results?.eligible ? (
          <>
            <h1 className="relative z-10 mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
              Eligible for <span className="bg-gradient-to-r from-[#46b8c3] to-[#8edce4] bg-clip-text text-transparent">{fmtLakhs(results.finalLoan)}</span>
            </h1>
            <p className="relative z-10 mx-auto max-w-2xl text-xl font-light leading-relaxed text-white/60 md:text-2xl">Based on your {fmt(derivedMonthlyIncome)}/mo income, {cibil} CIBIL score, and {fmtLakhs(propertyValue)} property.</p>
          </>
        ) : (
          <>
            <h1 className="relative z-10 mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">{ageError ? 'Age Out of Range' : cibilAdj.factor === 0 ? 'CIBIL Too Low' : 'Obligations Too High'}</h1>
            <p className="relative z-10 mx-auto max-w-2xl text-xl font-light leading-relaxed text-white/60">{ageError || (cibilAdj.factor === 0 ? 'CIBIL score below 650 - most lenders will decline.' : 'Existing EMIs exceed your allowed capacity. Reduce obligations or increase income.')}</p>
          </>
        )}
      </motion.div>

      {results?.eligible ? (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={staggerItem}><MiniStat label="FOIR Applied" value={`${(results.foirRate * 100).toFixed(0)}%`} /></motion.div>
              <motion.div variants={staggerItem}><MiniStat label="Net EMI Capacity" value={fmt(results.netEMI)} /></motion.div>
              <motion.div variants={staggerItem}><MiniStat label="Max Tenure" value={`${results.tenureYears} years`} /></motion.div>
              <motion.div variants={staggerItem}><MiniStat label="Effective Rate" value={`${results.effectiveRate.toFixed(2)}%`} /></motion.div>
            </motion.div>
          </motion.div>

          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className={cn('rounded-3xl border bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg', cibil > 780 ? 'border-green-200' : cibil >= 750 ? 'border-blue-200' : 'border-amber-200')}>
              <div className="mb-6">
                <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', cibil > 780 ? 'bg-green-100 text-green-700' : cibil >= 750 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                  {cibil > 780 ? <TrendingUp className="h-4 w-4" /> : cibil >= 750 ? <Minus className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  CIBIL: {cibil}
                </div>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-[#0d3a5c]">Credit Score Impact</h3>
              <p className="mb-8 text-sm text-slate-500">Your score results in a <span className={cn('font-semibold', cibilAdj.color)}>{cibilAdj.label}</span> adjustment.</p>
              <div className="space-y-4">
                <SummaryRow label="Pre-adjustment" value={fmt(results.preCreditLoan)} dark={false} />
                <SummaryRow label="Multiplier" value={`x${results.cibilAdj.factor}`} dark={false} />
                <SummaryRow label="Final Amount" value={fmt(results.finalLoan)} accent dark={false} />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="relative overflow-hidden rounded-3xl border border-[#1b6896] bg-[#144d78] p-8 text-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1b6896]/30 to-transparent" />
              <div className="relative z-10 mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#46b8c3]/30 bg-[#46b8c3]/20 px-3 py-1 text-sm font-semibold text-[#46b8c3]">Loan Constraints</div>
              </div>
              <h3 className="relative z-10 mb-2 text-2xl font-bold text-white">Three-Way Cap</h3>
              <p className="relative z-10 mb-8 text-sm text-slate-300">Final eligibility is the minimum of EMI affordability, LTV cap, and requested amount.</p>
              <div className="relative z-10 space-y-4">
                <SummaryRow label="EMI Capacity" value={fmt(results.loanFromEMI)} />
                <SummaryRow label={`LTV Cap (${(results.ltvSlab * 100).toFixed(0)}%)`} value={fmt(results.loanByLTV)} />
                <SummaryRow label="Applied Amount" value={fmt(loanApplied)} />
                <SummaryRow label="Binding Constraint" value={fmt(results.preCreditLoan)} accent />
              </div>
            </motion.div>
          </div>

          <ScrollFadeIn className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#144d78]/10">
                <CheckCircle2 className="h-4 w-4 text-[#1b6896]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#0d3a5c]">How This Was Calculated</h3>
                <p className="mt-1 text-sm text-slate-500">Step-by-step eligibility assessment</p>
              </div>
            </div>
            <div className="space-y-4 p-8">
              {calculationSteps.map((item) => (
                <div key={item.s} className="flex items-start gap-4 rounded-lg bg-slate-50 p-4 transition-colors hover:bg-slate-100/80">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#144d78] text-sm font-bold text-white">
                    {item.s}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#0d3a5c]">{item.l}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.d}</div>
                  </div>
                  <div className="whitespace-nowrap text-right font-bold text-[#144d78]">{item.v}</div>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-8 py-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#46b8c3]/15">
                <CheckCircle2 className="h-4 w-4 text-[#1b6896]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#0d3a5c]">Reference Tables</h3>
                <p className="mt-1 text-sm text-slate-500">Industry norms used in this calculation</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">FOIR Slabs</h4>
                <div className="space-y-2 text-sm">
                  <div className={recognisedIncome < 50000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>{'<'} Rs. 50K / month -&gt; 40%</div>
                  <div className={recognisedIncome >= 50000 && recognisedIncome < 100000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Rs. 50K - Rs. 1L / month -&gt; 50%</div>
                  <div className={recognisedIncome >= 100000 && recognisedIncome < 200000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Rs. 1L - Rs. 2L / month -&gt; 55%</div>
                  <div className={recognisedIncome >= 200000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>{'>'} Rs. 2L / month -&gt; 60%</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">LTV Norms</h4>
                <div className="space-y-2 text-sm">
                  <div className={propertyValue <= 3000000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>{'<='} Rs. 30L property -&gt; 90%</div>
                  <div className={propertyValue > 3000000 && propertyValue <= 7500000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Rs. 30L - Rs. 75L property -&gt; 80%</div>
                  <div className={propertyValue > 7500000 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>{'>'} Rs. 75L property -&gt; 75%</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">LTV Rate Premium</h4>
                <div className="space-y-2 text-sm">
                  <div className={results.actualLTV <= 0.6 ? 'font-bold text-green-600' : 'text-slate-600'}>{'<='} 60% -&gt; -0.10%</div>
                  <div className={results.actualLTV > 0.6 && results.actualLTV <= 0.75 ? 'font-bold text-[#144d78]' : 'text-slate-600'}>61% - 75% -&gt; 0%</div>
                  <div className={results.actualLTV > 0.75 && results.actualLTV <= 0.8 ? 'font-bold text-amber-600' : 'text-slate-600'}>76% - 80% -&gt; +0.25%</div>
                  <div className={results.actualLTV > 0.8 ? 'font-bold text-red-500' : 'text-slate-600'}>{'>'} 80% -&gt; +0.50%</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">CIBIL To Base Rate</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { min: 800, max: 900, band: '800+', rate: '7.25%' },
                    { min: 775, max: 799, band: '775-799', rate: '7.50%' },
                    { min: 750, max: 774, band: '750-774', rate: '7.75%' },
                    { min: 725, max: 749, band: '725-749', rate: '8.10%' },
                    { min: 700, max: 724, band: '700-724', rate: '8.50%' },
                    { min: 675, max: 699, band: '675-699', rate: '8.95%' },
                    { min: 650, max: 674, band: '650-674', rate: '9.50%' },
                    { min: 0, max: 649, band: 'Below 650', rate: '10.25%' },
                  ].map((item) => (
                    <div key={item.band} className={cibil >= item.min && cibil <= item.max ? 'font-bold text-[#144d78]' : 'text-slate-600'}>
                      {item.band} -&gt; {item.rate}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">Max Tenure By Profile</h4>
                <div className="space-y-2 text-sm">
                  <div className={employment === 'salaried' ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Salaried -&gt; 30 years, retire at 60</div>
                  <div className={employment === 'self-employed' ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Self-Employed -&gt; 20 years, retire at 60</div>
                  <div className={employment === 'professional' ? 'font-bold text-[#144d78]' : 'text-slate-600'}>Professional -&gt; 30 years, retire at 65</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-semibold text-[#0d3a5c]">Current Underwriting Snapshot</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div>Recognised income -&gt; {fmt(recognisedIncome)}</div>
                  <div>FOIR used -&gt; {(results.foirRate * 100).toFixed(0)}%</div>
                  <div>Requested LTV -&gt; {(results.actualLTV * 100).toFixed(0)}%</div>
                  <div>Existing obligations -&gt; {fmt(obligations)}</div>
                </div>
              </div>
            </div>
          </ScrollFadeIn>
        </>
      ) : null}
    </>
  );
}
