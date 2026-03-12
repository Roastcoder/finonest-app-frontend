export type ApplicationStage = 
  | 'SUBMITTED'
  | 'LOGIN'
  | 'IN_PROCESS'
  | 'REJECTED'
  | 'APPROVED'
  | 'DISBURSED'
  | 'CANCELLED';

export type RCType = 'PHYSICAL_RC' | 'DIGITAL_RC';
export type CollectedBy = 'SELF' | 'RTO_AGENT' | 'BANKER';

export interface LoginStageData {
  appScore?: number;
  creditScore?: number;
}

export interface InProcessStageData {
  tags?: string[];
}

export interface RejectedStageData {
  remarks: string;
}

export interface ApprovedStageData {
  loanAmount: number;
  roi: number;
  tenure: number;
  approvedDate: string;
}

export interface RTOAgentData {
  name: string;
  mobileNo: string;
}

export interface BankerData {
  name: string;
  mobileNo: string;
}

export interface VehicleRCStatus {
  rcType: RCType;
  collectedBy: CollectedBy;
  rtoAgent?: RTOAgentData;
  banker?: BankerData;
}

export interface DisbursedStageData {
  loanAmount: number;
  roi: number;
  tenure: number;
  loanAccountNumber: string;
  vehicleRCStatus: VehicleRCStatus;
  disbursedDate: string;
}

export interface CancelledStageData {
  remarks: string;
  cancelledDate: string;
}

export interface ApplicationStageData {
  stage: ApplicationStage;
  updatedAt: string;
  updatedBy: string;
  loginData?: LoginStageData;
  inProcessData?: InProcessStageData;
  rejectedData?: RejectedStageData;
  approvedData?: ApprovedStageData;
  disbursedData?: DisbursedStageData;
  cancelledData?: CancelledStageData;
}

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  SUBMITTED: 'Submitted',
  LOGIN: 'Login',
  IN_PROCESS: 'In Process',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
  DISBURSED: 'Disbursed',
  CANCELLED: 'Cancelled'
};

export const STAGE_COLORS: Record<ApplicationStage, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  LOGIN: 'bg-yellow-100 text-yellow-700',
  IN_PROCESS: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-green-100 text-green-700',
  DISBURSED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-700'
};