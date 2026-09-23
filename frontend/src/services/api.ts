import axios from 'axios';
import {
  AccountRiskScore,
  MoneyFlowGraph,
  CashoutPrediction,
  ATMLocation,
  AlertItem,
  OverviewStats,
  CopilotQueryResponse,
  CaseBriefingData
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

  freezeAccount: async (
    accountId: number | string,
    payload: {
      freeze_type: string;
      reason: string;
      lien_amount?: number;
      nodal_bank_name?: string;
      investigator_name?: string;
    }
  ) => {
    const response = await client.post(`/accounts/${accountId}/freeze`, payload);
    return response.data;
  },

  unfreezeAccount: async (accountId: number | string) => {
    const response = await client.post(`/accounts/${accountId}/unfreeze`);
    return response.data;
  },

  getBnssNotice: async (accountId: number | string) => {
    const response = await client.get(`/accounts/${accountId}/bnss-notice`);
    return response.data;
  },

  copilotQuery: async (query: string, contextAccountId?: number): Promise<CopilotQueryResponse> => {
    const response = await client.post<CopilotQueryResponse>('/copilot/query', {
      query,
      context_account_id: contextAccountId
    });
    return response.data;
  },

  getCaseBriefing: async (accountId: number | string): Promise<CaseBriefingData> => {
    const response = await client.post<CaseBriefingData>(`/copilot/case-briefing/${accountId}`);
    return response.data;
  },

  getWithdrawalIntel: async (params?: { account_id?: number; atm_id?: number; limit?: number }) => {
    const response = await client.get<import('../types').WithdrawalIntel[]>('/predictions/withdrawals/intel', {
      params,
    });
    return response.data;
  },

  getAtmWithdrawals: async (atmId: number) => {
    const response = await client.get<import('../types').WithdrawalIntel[]>(`/predictions/atms/${atmId}/withdrawals`);
    return response.data;
  },

  getAccountWithdrawals: async (accountId: number | string) => {
    const response = await client.get<import('../types').WithdrawalIntel[]>(`/accounts/${accountId}/withdrawals`);
    return response.data;
  },
};

