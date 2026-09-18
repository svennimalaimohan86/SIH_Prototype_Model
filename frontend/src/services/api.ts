import axios from 'axios';
import {
  AccountRiskScore,
  MoneyFlowGraph,
  CashoutPrediction,
  ATMLocation,
  AlertItem,
  OverviewStats
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getRiskScores: async (): Promise<AccountRiskScore[]> => {
    const response = await client.get<AccountRiskScore[]>('/accounts/risk-scores');
    return response.data;
  },

  getAccountDetail: async (accountId: number | string): Promise<AccountRiskScore> => {
    const response = await client.get<AccountRiskScore>(`/accounts/${accountId}`);
    return response.data;
  },

  getMoneyFlow: async (accountId: number | string): Promise<MoneyFlowGraph> => {
    const response = await client.get<MoneyFlowGraph>(`/accounts/${accountId}/money-flow`);
    return response.data;
  },

  getCashoutPredictions: async (accountId: number | string): Promise<CashoutPrediction[]> => {
    const response = await client.get<CashoutPrediction[]>('/predictions/cashout', {
      params: { account_id: accountId },
    });
    return response.data;
  },

  getAllATMs: async (): Promise<ATMLocation[]> => {
    const response = await client.get<ATMLocation[]>('/predictions/atms');
    return response.data;
  },

  getAlerts: async (): Promise<AlertItem[]> => {
    const response = await client.get<AlertItem[]>('/alerts');
    return response.data;
  },

  getOverviewStats: async (): Promise<OverviewStats> => {
    const response = await client.get<OverviewStats>('/overview/stats');
    return response.data;
  },
};
