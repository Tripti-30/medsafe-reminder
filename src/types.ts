export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:mm format
  days: string[]; // ['Mon', 'Tue', ...]
  info?: string;
  lastTaken?: string; // ISO string
}

export interface MedicineInfo {
  benefits: string;
  usage: string;
  sideEffects: string;
  isSafe: boolean;
  generalAdvice: string;
}

export interface ImageAnalysisResult {
  medicineName: string;
  benefits: string;
  prescriptionBasis: string;
  confidence: number;
  isPrescription: boolean;
}
