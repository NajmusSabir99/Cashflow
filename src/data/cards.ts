import type { BusinessCard, DreamCard, ExpenseCard, InvestmentCard, LifeEventCard, MarketCard, ProfessionCard } from '../types';

export const PROFESSIONS: ProfessionCard[] = [
  { id: 'teacher', name: 'Teacher', salary: 12, livingExpense: 5, otherExpense: 3, startingCash: 10, description: 'A steady start with a tight monthly margin.' },
  { id: 'engineer', name: 'Engineer', salary: 20, livingExpense: 8, otherExpense: 5, startingCash: 20, description: 'A dependable income and room to invest.' },
  { id: 'doctor', name: 'Doctor', salary: 30, livingExpense: 12, otherExpense: 8, startingCash: 30, description: 'High earnings balanced by high expenses.' },
  { id: 'shopkeeper', name: 'Shopkeeper', salary: 18, livingExpense: 7, otherExpense: 4, startingCash: 15, description: 'Practical cash instincts and a modest reserve.' },
  { id: 'software-developer', name: 'Software Developer', salary: 24, livingExpense: 9, otherExpense: 5, startingCash: 25, description: 'Strong income with investment potential.' },
  { id: 'factory-worker', name: 'Factory Worker', salary: 10, livingExpense: 5, otherExpense: 2, startingCash: 5, description: 'A challenging start where each decision counts.' },
];

export const DREAMS: DreamCard[] = [
  { id: 'vacation-home', name: 'Vacation Home', cost: 100, description: 'Buy a quiet place for weekends away.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'charitable-foundation', name: 'Charitable Foundation', cost: 150, description: 'Fund a foundation that supports your community.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'luxury-apartment', name: 'Luxury Apartment', cost: 200, description: 'Own a premium city residence outright.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'private-company', name: 'Private Company', cost: 300, description: 'Purchase a private company and its future.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'world-tour', name: 'World Tour', cost: 125, description: 'Take a long trip across the world.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'creative-studio', name: 'Creative Studio', cost: 175, description: 'Build a studio for your next big idea.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'farm-retreat', name: 'Farm Retreat', cost: 225, description: 'Own a peaceful rural retreat.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
  { id: 'scholarship-fund', name: 'Scholarship Fund', cost: 250, description: 'Create an education fund for future students.', requirements: ['Reach the Fast Track', 'Have enough cash to pay the cost'] },
];

export const SMALL_OPPORTUNITIES: InvestmentCard[] = [
  { id: 'rental-room', name: 'Rental Room', category: 'real-estate', size: 'small', description: 'A modest room with stable demand.', price: 20, downPayment: 5, loanAmount: 15, monthlyIncome: 2, operatingExpense: 0.5, loanPayment: 1, risk: 'Low vacancy risk', saleMultiplier: 1.1 },
  { id: 'starter-flat', name: 'Starter Flat', category: 'real-estate', size: 'small', description: 'A compact apartment near transit.', price: 32, downPayment: 8, loanAmount: 24, monthlyIncome: 3.2, operatingExpense: 0.7, loanPayment: 1.4, risk: 'Moderate maintenance risk', saleMultiplier: 1.1 },
  { id: 'index-fund', name: 'Index Fund Units', category: 'fund', size: 'small', description: 'A diversified fund. Price is per unit.', price: 5, downPayment: 5, loanAmount: 0, monthlyIncome: 0.1, operatingExpense: 0, loanPayment: 0, risk: 'Market prices may fall', saleMultiplier: 1.15, unitPrice: 5 },
  { id: 'blue-chip-shares', name: 'Blue-Chip Shares', category: 'stock', size: 'small', description: 'Established company shares. Price is per share.', price: 4, downPayment: 4, loanAmount: 0, monthlyIncome: 0.12, operatingExpense: 0, loanPayment: 0, risk: 'Share price can fluctuate', saleMultiplier: 1.15, unitPrice: 4 },
  { id: 'fixed-deposit', name: 'Fixed Deposit Certificate', category: 'cd', size: 'small', description: 'A low-volatility certificate deposit.', price: 10, downPayment: 10, loanAmount: 0, monthlyIncome: 0.3, operatingExpense: 0, loanPayment: 0, risk: 'Lower return, lower volatility', saleMultiplier: 1.02, unitPrice: 10 },
  { id: 'parking-space', name: 'Parking Space', category: 'real-estate', size: 'small', description: 'A single parking space leased monthly.', price: 18, downPayment: 6, loanAmount: 12, monthlyIncome: 1.7, operatingExpense: 0.2, loanPayment: 0.7, risk: 'Demand varies by location', saleMultiplier: 1.1 },
  { id: 'storage-unit', name: 'Storage Unit', category: 'real-estate', size: 'small', description: 'Small storage with recurring rent.', price: 24, downPayment: 6, loanAmount: 18, monthlyIncome: 2.5, operatingExpense: 0.4, loanPayment: 1, risk: 'Occupancy can vary', saleMultiplier: 1.1 },
  { id: 'bond-fund', name: 'Bond Fund Units', category: 'fund', size: 'small', description: 'Income-oriented fund units. Price is per unit.', price: 6, downPayment: 6, loanAmount: 0, monthlyIncome: 0.15, operatingExpense: 0, loanPayment: 0, risk: 'Interest-rate sensitivity', saleMultiplier: 1.05, unitPrice: 6 },
  { id: 'micro-shop', name: 'Street-Facing Shop', category: 'real-estate', size: 'small', description: 'A tiny retail unit in a busy lane.', price: 28, downPayment: 7, loanAmount: 21, monthlyIncome: 3.1, operatingExpense: 0.8, loanPayment: 1.3, risk: 'Tenant and repair risk', saleMultiplier: 1.12 },
  { id: 'utility-shares', name: 'Utility Shares', category: 'stock', size: 'small', description: 'Dividend-focused shares. Price is per share.', price: 3, downPayment: 3, loanAmount: 0, monthlyIncome: 0.08, operatingExpense: 0, loanPayment: 0, risk: 'Dividend and price risk', saleMultiplier: 1.1, unitPrice: 3 },
];

export const BIG_OPPORTUNITIES: InvestmentCard[] = [
  { id: 'apartment-building', name: 'Apartment Building', category: 'real-estate', size: 'big', description: 'Several rental units under one roof.', price: 100, downPayment: 25, loanAmount: 75, monthlyIncome: 10, operatingExpense: 2, loanPayment: 5, risk: 'Larger repair and vacancy exposure', saleMultiplier: 1.2 },
  { id: 'office-floor', name: 'Office Floor', category: 'real-estate', size: 'big', description: 'Lease office space to multiple tenants.', price: 120, downPayment: 30, loanAmount: 90, monthlyIncome: 12, operatingExpense: 2.5, loanPayment: 6, risk: 'Commercial demand can change', saleMultiplier: 1.2 },
  { id: 'retail-plaza', name: 'Retail Plaza Unit', category: 'real-estate', size: 'big', description: 'A larger unit with multiple shopfronts.', price: 90, downPayment: 23, loanAmount: 67, monthlyIncome: 9, operatingExpense: 2, loanPayment: 4.5, risk: 'Retail tenant concentration', saleMultiplier: 1.2 },
  { id: 'warehouse', name: 'Urban Warehouse', category: 'real-estate', size: 'big', description: 'Storage space for growing businesses.', price: 85, downPayment: 22, loanAmount: 63, monthlyIncome: 8, operatingExpense: 1.4, loanPayment: 4, risk: 'Location and maintenance risk', saleMultiplier: 1.18 },
  { id: 'dividend-portfolio', name: 'Dividend Portfolio', category: 'stock', size: 'big', description: 'A large share bundle with regular dividends.', price: 50, downPayment: 50, loanAmount: 0, monthlyIncome: 1.5, operatingExpense: 0, loanPayment: 0, risk: 'Portfolio value can fall sharply', saleMultiplier: 1.2, unitPrice: 50 },
];

export const BUSINESSES: BusinessCard[] = [
  { id: 'small-franchise', name: 'Small Franchise', price: 50, monthlyNet: 5, description: 'A compact franchise with a proven model.', risk: 'Needs steady oversight' },
  { id: 'retail-chain', name: 'Retail Chain', price: 100, monthlyNet: 10, description: 'A small chain with repeat customers.', risk: 'Inventory and staff risk' },
  { id: 'manufacturing-company', name: 'Manufacturing Company', price: 200, monthlyNet: 20, description: 'A scaled operation with larger upside.', risk: 'Higher operating complexity' },
  { id: 'software-business', name: 'Software Business', price: 150, monthlyNet: 15, description: 'Recurring revenue from a focused software product.', risk: 'Competition and churn' },
  { id: 'commercial-property', name: 'Commercial Property', price: 250, monthlyNet: 25, description: 'A commercial asset with strong net cash flow.', risk: 'Large capital commitment' },
  { id: 'online-store', name: 'Online Store', price: 70, monthlyNet: 7, description: 'A direct-to-customer business.', risk: 'Demand and fulfilment risk' },
  { id: 'logistics-firm', name: 'Local Logistics Firm', price: 125, monthlyNet: 12, description: 'A small delivery and fulfilment network.', risk: 'Fuel and operational risk' },
  { id: 'training-centre', name: 'Training Centre', price: 80, monthlyNet: 8, description: 'A skills-focused education business.', risk: 'Enrollment may fluctuate' },
];

export const EXPENSES: ExpenseCard[] = [
  { id: 'phone-upgrade', name: 'Phone Upgrade', description: 'A new device and accessories.', cost: 2, effect: 'none' },
  { id: 'family-wedding', name: 'Family Wedding', description: 'Help cover a family celebration.', cost: 3, effect: 'none' },
  { id: 'new-car', name: 'New Car', description: 'Your monthly transport costs rise.', cost: 0, effect: 'new-car', value: 1 },
  { id: 'holiday', name: 'Holiday', description: 'A short break was worth it, but it was not free.', cost: 4, effect: 'none' },
  { id: 'education-course', name: 'Education Course', description: 'Pay now; your salary rises by 2 GM/month from the next Payday.', cost: 3, effect: 'education', value: 2 },
  { id: 'medical-expense', name: 'Medical Expense', description: 'An unexpected clinic bill.', cost: 2, effect: 'none' },
  { id: 'new-baby', name: 'New Baby', description: 'Welcome a new child and add 1 GM/month to expenses.', cost: 0, effect: 'baby', value: 1 },
  { id: 'house-renovation', name: 'House Renovation', description: 'An urgent improvement to your home.', cost: 5, effect: 'none' },
  { id: 'computer-repair', name: 'Computer Repair', description: 'Get your work computer running again.', cost: 2, effect: 'none' },
  { id: 'car-insurance', name: 'Car Insurance', description: 'Your monthly insurance cost increases.', cost: 0, effect: 'insurance', value: 0.5 },
];

export const LIFE_EVENTS: LifeEventCard[] = [
  { id: 'promotion', name: 'Promotion', description: 'Your monthly salary rises by 3 GM.', effect: 'promotion', value: 3 },
  { id: 'job-loss', name: 'Job Loss', description: 'Salary is suspended for your next two active turns.', effect: 'job-loss', value: 2 },
  { id: 'side-business', name: 'Side Business', description: 'A side project produces 2 GM/month.', effect: 'side-business', value: 2 },
  { id: 'inheritance', name: 'Inheritance', description: 'A relative leaves you 5 GM.', effect: 'inheritance', value: 5 },
  { id: 'unexpected-repair', name: 'Unexpected Repair', description: 'Pay 2 GM to repair an essential item.', effect: 'repair', value: 2 },
  { id: 'inflation', name: 'Inflation', description: 'Everyone’s living expenses rise by 1 GM/month.', effect: 'inflation', value: 1 },
];

export const MARKETS: MarketCard[] = [
  { id: 'property-boom', name: 'Property Boom', description: 'All owned property values rise by 25%.', effect: 'property-boom', factor: 1.25 },
  { id: 'property-correction', name: 'Property Correction', description: 'All owned property values fall by 20%.', effect: 'property-crash', factor: 0.8 },
  { id: 'stock-rally', name: 'Stock Rally', description: 'All stock and fund holdings rise by 30%.', effect: 'stock-rise', factor: 1.3 },
  { id: 'market-pullback', name: 'Market Pullback', description: 'All stock and fund holdings fall by 25%.', effect: 'stock-fall', factor: 0.75 },
  { id: 'higher-rates', name: 'Higher Lending Rates', description: 'Bank loan interest increases from 10% to 12% monthly, permanently.', effect: 'interest-rise', value: 0.12 },
  { id: 'business-buyer', name: 'New Business Buyer', description: 'You may sell one owned asset at 140% of its current value. Any attached debt must be repaid.', effect: 'business-buyer', factor: 1.4 },
  { id: 'dividend-surprise', name: 'Dividend Surprise', description: 'Stock and fund holdings add 0.2 GM/month in income each.', effect: 'dividend', value: 0.2 },
  { id: 'rental-demand', name: 'Rental Demand', description: 'Owned property income increases by 0.5 GM/month per property.', effect: 'rental-demand', value: 0.5 },
];

export const CARD_BY_ID = {
  small: Object.fromEntries(SMALL_OPPORTUNITIES.map((c) => [c.id, c])),
  big: Object.fromEntries(BIG_OPPORTUNITIES.map((c) => [c.id, c])),
  market: Object.fromEntries(MARKETS.map((c) => [c.id, c])),
  expense: Object.fromEntries(EXPENSES.map((c) => [c.id, c])),
  life: Object.fromEntries(LIFE_EVENTS.map((c) => [c.id, c])),
  business: Object.fromEntries(BUSINESSES.map((c) => [c.id, c])),
};
