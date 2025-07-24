import fetch from 'node-fetch';

export interface SamedayConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface SamedayAuthResponse {
  token: string;
  expire_at: string;
}

export interface SamedayPickupPoint {
  id: number;
  name: string;
  county: string;
  city: string;
  address: string;
  contactPersons: Array<{
    id: number;
    name: string;
    phone: string;
    email: string;
    default: boolean;
  }>;
}

export interface SamedayService {
  id: number;
  name: string;
  serviceOptionalTaxes: Array<{
    id: number;
    name: string;
    tax: number;
  }>;
}

export interface SamedayCounty {
  id: number;
  name: string;
  code: string;
}

export interface SamedayCity {
  id: number;
  name: string;
  county: string;
  postalCode: string;
}

export interface AWBParcel {
  weight: number;
  width?: number;
  length?: number;
  height?: number;
  awbParcelNumber?: string;
}

export interface AWBRecipient {
  name: string;
  phoneNumber: string;
  personType: string; // "individual" or "company"
  companyName?: string;
  address: string;
  countyId?: number;
  cityId?: number;
  postalCode?: string;
}

export interface CreateAWBRequest {
  pickupPointId: number;
  serviceId: number;
  packageType: string; // "PARCEL", "ENVELOPE", "LARGE"
  awbPayment: string; // "SENDER", "RECIPIENT", "THIRD_PARTY"
  recipient: AWBRecipient;
  parcels: AWBParcel[];
  codAmount?: number;
  insuredValue?: number;
  observation?: string;
  reference?: string;
}

export interface CreateAWBResponse {
  awbNumber: string;
  parcels: Array<{
    parcelAwbNumber: string;
    position: number;
  }>;
  cost: number;
  currency: string;
  pdfLink?: string;
}

export class SamedayAPI {
  private config: SamedayConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: SamedayConfig) {
    this.config = config;
  }

  private async authenticate(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch(`${this.config.baseUrl}/api/authenticate`, {
      method: 'POST',
      headers: {
        'X-AUTH-USERNAME': this.config.username,
        'X-AUTH-PASSWORD': this.config.password,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sameday authentication failed: ${response.statusText}`);
    }

    const authData = await response.json() as SamedayAuthResponse;
    this.token = authData.token;
    this.tokenExpiry = new Date(authData.expire_at);
    
    console.log('✅ Sameday authentication successful, token expires:', authData.expire_at);
    return this.token;
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-AUTH-TOKEN': token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sameday API error: ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getPickupPoints(): Promise<SamedayPickupPoint[]> {
    const response = await this.apiRequest<{ data: SamedayPickupPoint[] }>('/api/client/pickup-points');
    return response.data;
  }

  async getServices(): Promise<SamedayService[]> {
    const response = await this.apiRequest<{ data: SamedayService[] }>('/api/client/services');
    return response.data;
  }

  async getCounties(): Promise<SamedayCounty[]> {
    const response = await this.apiRequest<{ data: SamedayCounty[] }>('/api/geolocation/county');
    return response.data;
  }

  async getCities(countyFilter?: string): Promise<SamedayCity[]> {
    let endpoint = '/api/geolocation/city?countPerPage=1000';
    if (countyFilter) {
      endpoint += `&county=${encodeURIComponent(countyFilter)}`;
    }
    const response = await this.apiRequest<{ data: SamedayCity[] }>(endpoint);
    return response.data;
  }

  async createAWB(awbData: CreateAWBRequest): Promise<CreateAWBResponse> {
    console.log('🚚 Creating AWB with Sameday:', JSON.stringify(awbData, null, 2));

    const response = await this.apiRequest<CreateAWBResponse>('/api/awb', {
      method: 'POST',
      body: JSON.stringify(awbData),
    });

    console.log('✅ AWB created successfully:', response.awbNumber);
    return response;
  }

  async getAWBPDF(awbNumber: string): Promise<Buffer> {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/awb/${awbNumber}/pdf`, {
      headers: {
        'X-AUTH-TOKEN': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get AWB PDF: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async trackAWB(awbNumber: string): Promise<any> {
    return this.apiRequest(`/api/awb/${awbNumber}/status-history`);
  }
}

// Factory function to create Sameday API instance
export function createSamedayAPI(): SamedayAPI | null {
  const username = process.env.SAMEDAY_USERNAME;
  const password = process.env.SAMEDAY_PASSWORD;
  const baseUrl = process.env.SAMEDAY_BASE_URL || 'https://api.sameday.ro';

  if (!username || !password) {
    console.warn('⚠️ Sameday credentials not configured');
    return null;
  }

  return new SamedayAPI({
    baseUrl,
    username,
    password,
  });
}