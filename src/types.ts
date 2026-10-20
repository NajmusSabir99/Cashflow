export type Stage = 'rat-race' | 'fast-track';
export type GamePhase = 'ready' | 'choose-die' | 'decision' | 'insufficient' | 'rat-race-exit' | 'handover' | 'finished';
export type VictoryMode = 'dream' | 'cashflow';
export type AssetCategory = 'real-estate' | 'stock' | 'fund' | 'cd' | 'business' | 'other';
export type LiabilityKind = 'bank-loan' | 'investment-loan' | 'mortgage' | 'other';

export interface ProfessionCard {
  id: string; name: string; salary: number; livingExpense: number; otherExpense: number; startingCash: number; description: string;
}
export interface DreamCard {
  id: string; name: string; cost: number; description: string; requirements: string[];
}
export interface InvestmentCard {
  id: string; name: string; category: AssetCategory; size: 'small' | 'big'; description: string;
  price: number; downPayment: number; loanAmount: number; monthlyIncome: number; operatingExpense: number; loanPayment: number;
  risk: string; saleMultiplier: number; unitPrice?: number;
}
export interface BusinessCard {
  id: string; name: string; price: number; monthlyNet: number; description: string; risk: string;
}
export interface ExpenseCard {
  id: string; name: string; description: string; cost: number; effect: 'none' | 'new-car' | 'education' | 'baby' | 'insurance'; value?: number;
}
export interface LifeEventCard {
  id: string; name: string; description: string; effect: 'promotion' | 'job-loss' | 'side-business' | 'inheritance' | 'repair' | 'inflation'; value?: number;
}
export interface MarketCard {
  id: string; name: string; description: string; effect: 'property-boom' | 'property-crash' | 'stock-rise' | 'stock-fall' | 'interest-rise' | 'business-buyer' | 'dividend' | 'rental-demand'; factor?: number; value?: number;
}

export interface Asset {
  id: string; name: string; category: AssetCategory; purchasePrice: number; currentValue: number;
  monthlyIncome: number; operatingExpense: number; loanPayment: number; liabilityId?: string;
  quantity?: number; unitPurchasePrice?: number; unitCurrentPrice?: number; description?: string; risk?: string; liquidationMultiplier: number;
}
export interface Liability {
  id: string; name: string; kind: LiabilityKind; principal: number; monthlyPayment: number; monthlyRate?: number; assetId?: string;
}
export interface ProfessionState {
  id: string; name: string; salary: number; livingExpense: number; otherExpense: number;
}
export interface Player {
  id: string; name: string; color: string; profession: ProfessionState; stage: Stage; position: number;
  cash: number; childCount: number; otherIncome: number; otherExpense: number; otherRecurringExpense: number; pendingSalaryIncrease: number; assets: Asset[]; liabilities: Liability[];
  dreamId: string; dreamCompleted: boolean; salarySuspendedTurns: number; skipTurns: number; charityTurns: number;
  bankrupt: boolean; restartCount: number; cashFlowHistory: number[]; realizedProfitLoss: number; salarySuspendedAtTurn: number | null;
}

export type DeckName = 'small' | 'big' | 'market' | 'expense' | 'life' | 'business';
export interface DeckState { drawPile: string[]; discardPile: string[]; }
export type Decks = Record<DeckName, DeckState>;

export interface Transaction {
  id: string; turn: number; playerId: string; playerName: string; type: string; summary: string;
  cashImpact: number; cashFlowImpact?: number; reference?: string; timestamp: number;
}

export interface GameConfig {
  victoryMode: VictoryMode; cashFlowTarget: number; restartAfterBankruptcy: boolean; tutorialPrompts: boolean; turnLimit: number | null;
}

export type PendingDecision =
  | { type: 'investment'; card: InvestmentCard; deck: 'small' | 'big'; quantity: number }
  | { type: 'business'; card: BusinessCard }
  | { type: 'expense'; card: ExpenseCard }
  | { type: 'life'; card: LifeEventCard }
  | { type: 'charity' }
  | { type: 'dream'; dream: DreamCard }
  | { type: 'market-sale'; card: MarketCard; eligibleAssetIds: string[] }
  | { type: 'notice'; title: string; description: string; cardId?: string }
  | { type: 'payment'; amount: number; reason: string; continuation: 'finish' | 'resolve-landing' | 'downsize'; sourceCardId?: string };

export interface GameState {
  id: string; players: Player[]; currentPlayerIndex: number; turn: number; round: number;
  phase: GamePhase; decks: Decks; transactions: Transaction[]; config: GameConfig; winnerId?: string;
  dice: number[]; rolledTotal: number; lastRollPath: number[]; lastEvent: string; pending?: PendingDecision;
  bankInterestRate: number; saveUpdatedAt: number; turnsTaken: number;
}

export interface PlayerSetup {
  id: string; name: string; color: string; professionId: string; dreamId: string;
}
