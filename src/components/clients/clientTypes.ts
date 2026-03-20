import type { FinancialStatus } from '@/hooks/useClientFinancialStatus';

export interface DisplayClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  property: string;
  paymentStatus: FinancialStatus;
  avatar: string;
  source: 'clients' | 'contract';
  monthlyRent?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  buildingId?: string | null;
  buildingName?: string | null;
}
