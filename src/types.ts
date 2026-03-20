export interface Stock {
  id: string;
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  sector: string;
  score: number;
  targetPrice: number;
  targetBroker: string;
  targetDate: string;
  currentPrice: number;
  disparity: number;
  roe: number;
  sectorRoe: number;
  per: number;
  sectorPer: number;
  peg: number;
  sectorPeg: number;
  fcf: number;
  sectorFcf: number;
  pbr: number;
  sectorPbr: number;
  valueScore: number;
  signal: 'BUY' | 'WAIT';
  news: string;
  themes: string[];
  targetUpgraded?: boolean;
}

export interface MacroIndicator {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  upImpact?: string;
  downImpact?: string;
  link?: string;
}

export interface MacroInsight {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  beneficiaries: string[];
}

export interface MacroData {
  indicators: MacroIndicator[];
  insights: MacroInsight[];
}
