
export type AppView = 'INTRO' | 'LOGIN' | 'SCAN' | 'COLLECTION' | 'MAP' | 'RESULT' | 'PROFILE' | 'ADMIN' | 'SUBSCRIPTION' | 'SETTINGS' | 'LEGAL';

export type UserRole = 'LEGIONNAIRE' | 'CENTURION' | 'ADMIN';

export type UserPlan = 'FREE' | 'CENTURION' | 'IMPERATOR';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  plan: UserPlan;
  joinedDate: number;
  bio?: string;
}

export interface CoinData {
  id: string;
  name: string;
  civilization: 'Roman' | 'Iberian' | 'Romana' | 'Ibérica';
  period: string;
  material: string;
  denomination: string;
  obverseImage: string;
  reverseImage: string;
  historicalScene?: string;
  description: string;
  historicalContext?: string;
  referenceCodes: string[];
  confidence: number;
  weight?: number;
  diameter?: number;
  estimatedValue?: string;
  mint?: string;
  rarity?: string;
  location?: {
    lat: number;
    lng: number;
  };
  dateSaved: number;
}

export interface IdentificationResult {
  bestMatch: Partial<CoinData>;
  alternatives: Partial<CoinData>[];
  confidence: number;
}
