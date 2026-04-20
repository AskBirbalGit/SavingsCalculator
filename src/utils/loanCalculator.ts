export function calculateEMI(principal: number, annualRate: number, months: number): number {
  const dailyRate = annualRate / 365 / 100;
  // Effective monthly rate with daily compounding: (1 + dailyRate)^30 - 1
  const monthlyRate = Math.pow(1 + dailyRate, 30) - 1;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function calculateTenure(principal: number, annualRate: number, emi: number): number {
  const dailyRate = annualRate / 365 / 100;
  const monthlyRate = Math.pow(1 + dailyRate, 30) - 1;
  const x = emi / (principal * monthlyRate);
  if (x <= 1) return Infinity; // EMI is less than interest
  return Math.log(x / (x - 1)) / Math.log(1 + monthlyRate);
}

export function generateAmortizationSchedule(principal: number, annualRate: number, emi: number, months: number) {
  let balance = principal;
  const dailyRate = annualRate / 365 / 100;
  const schedule = [];
  let totalInterest = 0;
  const safeMonths = isFinite(months) ? Math.min(months, 1200) : 1200;

  for (let month = 1; month <= safeMonths; month++) {
    // Assume 30 days per month
    const daysInMonth = 30;
    let monthlyInterest = 0;

    // Daily compounding within the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dailyInterest = balance * dailyRate;
      monthlyInterest += dailyInterest;
      balance += dailyInterest;
    }

    totalInterest += monthlyInterest;

    // Apply EMI payment
    let principalPayment = 0;
    if (balance > 0) {
      const emiPayment = Math.min(emi, balance);
      principalPayment = emiPayment;
      balance -= emiPayment;
    }

    if (month % 12 === 0 || balance <= 0) {
      schedule.push({
        month: month,
        year: Math.ceil(month / 12),
        balance: Math.max(0, balance),
        interestPaid: totalInterest,
        principalPaid: principal - balance
      });
    }

    if (balance <= 0) break;
  }

  return schedule;
}

export function generatePrepaymentAmortizationSchedule(principal: number, annualRate: number, emi: number, months: number, prepaymentAmount: number, frequencyDays: number, stepUpAmount: number = 0, stepUpFrequencyDays: number = 30) {
  let balance = principal;
  const dailyRate = annualRate / 365 / 100;
  const schedule = [];
  let totalInterest = 0;
  let totalPrepayments = 0;
  let totalEmis = 0;
  const safeDays = isFinite(months) ? Math.min(months * 30, 1200 * 30) : 1200 * 30;
  let currentPrepaymentAmount = prepaymentAmount;

  for (let day = 1; day <= safeDays; day++) {
    const dailyInterest = balance * dailyRate;
    balance += dailyInterest;
    totalInterest += dailyInterest;

    if (stepUpAmount > 0 && frequencyDays > 0 && day % stepUpFrequencyDays === 0) {
      currentPrepaymentAmount += stepUpAmount;
    }

    if (frequencyDays > 0 && day % frequencyDays === 0) {
      const prepayment = Math.min(currentPrepaymentAmount, balance);
      balance -= prepayment;
      totalPrepayments += prepayment;
    }

    if (day % 30 === 0 && balance > 0) {
      const emiPayment = Math.min(emi, balance);
      balance -= emiPayment;
      totalEmis += emiPayment;
    }

    if (day % 360 === 0 || balance <= 0 || day === safeDays) {
      schedule.push({
        month: Math.ceil(day / 30),
        year: Math.ceil(day / 360),
        balance: Math.max(0, balance),
        interestPaid: totalInterest,
        principalPaid: principal - balance,
        totalPrepayments,
        totalEmis,
      });
    }

    if (balance <= 0) break;
  }

  return schedule;
}

export function calculateInvestmentBreakEven(principal: number, annualRate: number, emi: number, months: number, contributionAmount: number, frequencyDays: number, stepUpAmount: number = 0, stepUpFrequencyDays: number = 30, annualInvestmentReturn: number = 12) {
  const dailyLoanRate = annualRate / 365 / 100;
  const dailyInvestmentRate = annualInvestmentReturn / 365 / 100;
  const safeDays = isFinite(months) ? Math.min(months * 30, 1200 * 30) : 1200 * 30;

  let loanBalance = principal;
  let investmentValue = 0;
  let currentContribution = contributionAmount;
  let totalInterest = 0;
  let totalContributions = 0;

  for (let day = 1; day <= safeDays; day++) {
    const dailyInterest = loanBalance * dailyLoanRate;
    loanBalance += dailyInterest;
    totalInterest += dailyInterest;

    investmentValue += investmentValue * dailyInvestmentRate;

    if (stepUpAmount > 0 && frequencyDays > 0 && day % stepUpFrequencyDays === 0) {
      currentContribution += stepUpAmount;
    }

    if (frequencyDays > 0 && day % frequencyDays === 0) {
      investmentValue += currentContribution;
      totalContributions += currentContribution;
    }

    if (day % 30 === 0) {
      loanBalance -= Math.min(emi, loanBalance);
    }

    if (investmentValue >= loanBalance) {
      return {
        day,
        month: Math.ceil(day / 30),
        year: Math.ceil(day / 360),
        investmentValue,
        loanBalance,
        totalInterestPaid: totalInterest,
        totalContributions,
        surplusCorpus: investmentValue - loanBalance,
      };
    }

    if (loanBalance <= 0) break;
  }

  return null;
}

export function generateInvestmentSchedule(principal: number, annualRate: number, emi: number, months: number, contributionAmount: number, frequencyDays: number, stepUpAmount: number = 0, stepUpFrequencyDays: number = 30, annualInvestmentReturn: number = 12) {
  const dailyLoanRate = annualRate / 365 / 100;
  const dailyInvestmentRate = annualInvestmentReturn / 365 / 100;
  const safeDays = isFinite(months) ? Math.min(months * 30, 1200 * 30) : 1200 * 30;

  let loanBalance = principal;
  let investmentValue = 0;
  let currentContribution = contributionAmount;
  const schedule = [];
  let loanClosed = false;

  for (let day = 1; day <= safeDays; day++) {
    loanBalance += loanBalance * dailyLoanRate;
    investmentValue += investmentValue * dailyInvestmentRate;

    if (stepUpAmount > 0 && frequencyDays > 0 && day % stepUpFrequencyDays === 0) {
      currentContribution += stepUpAmount;
    }

    if (frequencyDays > 0 && day % frequencyDays === 0) {
      investmentValue += currentContribution;
    }

    if (day % 30 === 0) {
      loanBalance -= Math.min(emi, loanBalance);
    }

    if (!loanClosed && investmentValue >= loanBalance) {
      loanClosed = true;
    }

    if (day % 360 === 0 || loanBalance <= 0) {
      schedule.push({
        year: Math.ceil(day / 360),
        investmentValue,
        loanBalance: Math.max(0, loanBalance),
      });
    }

    if (loanBalance <= 0) break;
  }

  return schedule;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatLakhs(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  return `₹${(amount / 100000).toFixed(2)} L`;
}

export function formatExact(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}
