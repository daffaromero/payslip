/**
 * Indonesian BPJS (Social Security) Calculations
 * BPJS Kesehatan & BPJS Ketenagakerjaan
 */

// BPJS Kesehatan (Health Insurance)
export function calculateBpjsKesehatan(salary: number) {
  const maxSalary = 12000000 // Maximum salary cap for calculation
  const baseSalary = Math.min(salary, maxSalary)
  
  return {
    employee: Math.round(baseSalary * 0.01), // 1% employee
    employer: Math.round(baseSalary * 0.04), // 4% employer
  }
}

// BPJS Ketenagakerjaan (Employment Insurance)
export function calculateBpjsKetenagakerjaan(salary: number) {
  const maxSalary = 10000000 // Maximum salary cap
  const baseSalary = Math.min(salary, maxSalary)
  
  return {
    // JKK (Work Accident Insurance) - varies by risk level, default 0.24%
    jkk: Math.round(baseSalary * 0.0024),
    // JKM (Death Insurance) - 0.3%
    jkm: Math.round(baseSalary * 0.003),
    // JHT (Old Age Savings) - 2% employee, 3.7% employer
    jht: {
      employee: Math.round(baseSalary * 0.02),
      employer: Math.round(baseSalary * 0.037),
    },
    // JP (Pension) - 1% employee, 2% employer
    jp: {
      employee: Math.round(baseSalary * 0.01),
      employer: Math.round(baseSalary * 0.02),
    },
  }
}

export function calculateTotalBpjsDeductions(salary: number): number {
  const kesehatan = calculateBpjsKesehatan(salary)
  const ketenagakerjaan = calculateBpjsKetenagakerjaan(salary)
  
  return (
    kesehatan.employee +
    ketenagakerjaan.jht.employee +
    ketenagakerjaan.jp.employee
  )
}

export function calculateTotalBpjsEmployerContribution(salary: number): number {
  const kesehatan = calculateBpjsKesehatan(salary)
  const ketenagakerjaan = calculateBpjsKetenagakerjaan(salary)
  
  return (
    kesehatan.employer +
    ketenagakerjaan.jkk +
    ketenagakerjaan.jkm +
    ketenagakerjaan.jht.employer +
    ketenagakerjaan.jp.employer
  )
}
