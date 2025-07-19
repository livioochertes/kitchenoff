// Using native fetch API (available in Node.js 18+)

export interface SmartbillConfig {
  username: string;
  token: string;
  companyVat: string;
}

export interface SmartbillProduct {
  name: string;
  code?: string;
  um: string; // unit of measure
  quantity: number;
  price: number;
  vatPercentage?: number;
  vatAmount?: number;
  currency?: string;
}

export interface SmartbillClient {
  name: string;
  vatCode?: string;
  regCom?: string;
  address?: string;
  email?: string;
  phone?: string;
  contact?: string;
  country?: string;
  county?: string;
  city?: string;
}

export interface SmartbillInvoiceData {
  companyVat: string;
  seriesName: string;
  client: SmartbillClient;
  issueDate: string;
  dueDate?: string;
  products: SmartbillProduct[];
  language?: string;
  currency?: string;
  precision?: number;
  mentions?: string;
  paymentUrl?: string;
  sendEmail?: boolean;
}

export class SmartbillAPI {
  private baseUrl = 'https://ws.smartbill.ro/SBORO/api';
  private config: SmartbillConfig;

  constructor(config: SmartbillConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.token}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private getHeaders(contentType: string = 'application/json'): Record<string, string> {
    return {
      'Content-Type': contentType,
      'Accept': 'application/json',
      'Authorization': this.getAuthHeader(),
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ test: true })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Smartbill connection test failed:', error);
      return false;
    }
  }

  /**
   * Create invoice via Smartbill API
   */
  async createInvoice(invoiceData: SmartbillInvoiceData): Promise<any> {
    try {
      console.log('Creating Smartbill invoice:', JSON.stringify(invoiceData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/invoice`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smartbill API error response:', response.status, errorText);
        throw new Error(`Smartbill API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Smartbill invoice created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating Smartbill invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice PDF from Smartbill
   */
  async getInvoicePdf(companyVat: string, seriesName: string, number: string): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/invoice/pdf`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/octet-stream'
        },
        body: JSON.stringify({
          cif: companyVat,
          seriesname: seriesName,
          number: number
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get PDF: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error getting invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Check if invoice is paid
   */
  async isInvoicePaid(companyVat: string, seriesName: string, number: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/invoice/paymentstatus`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cif: companyVat,
          seriesname: seriesName,
          number: number
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to check payment status: ${response.status}`);
      }

      const result = await response.json();
      return result.paid === true;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(companyVat: string, seriesName: string, number: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/invoice/cancel`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cif: companyVat,
          seriesname: seriesName,
          number: number
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel invoice: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error canceling invoice:', error);
      throw error;
    }
  }

  /**
   * Send invoice by email
   */
  async sendInvoiceByEmail(
    companyVat: string,
    seriesName: string,
    number: string,
    to: string,
    subject?: string,
    bodyText?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/document/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cif: companyVat,
          type: 'factura',
          seriesname: seriesName,
          number: number,
          to: to,
          subject: subject || 'Invoice from KitchenOff',
          bodyText: bodyText || 'Please find attached your invoice.'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send invoice by email: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending invoice by email:', error);
      throw error;
    }
  }

  /**
   * Get available VAT rates
   */
  async getVatRates(companyVat: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tax?cif=${companyVat}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get VAT rates: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting VAT rates:', error);
      return [];
    }
  }

  /**
   * Get available document series
   */
  async getDocumentSeries(companyVat: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/series?cif=${companyVat}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get document series: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting document series:', error);
      return [];
    }
  }
}

/**
 * Helper function to convert order to Smartbill invoice format
 */
export function orderToSmartbillInvoice(
  order: any,
  user: any,
  config: SmartbillConfig,
  seriesName: string = 'FACT'
): SmartbillInvoiceData {
  // Format client data
  const client: SmartbillClient = {
    name: user.companyName || `${user.firstName} ${user.lastName}`,
    email: user.email,
    address: order.billingAddress?.street || order.shippingAddress?.street,
    city: order.billingAddress?.city || order.shippingAddress?.city,
    country: order.billingAddress?.country || order.shippingAddress?.country,
    phone: user.billingPhone,
    contact: user.companyName ? `${user.firstName} ${user.lastName}` : undefined,
    vatCode: user.vatNumber,
    regCom: user.registrationNumber,
  };

  // Format products
  const products: SmartbillProduct[] = order.items.map((item: any) => ({
    name: item.product.name,
    code: item.product.productCode || item.productId.toString(),
    um: 'buc', // pieces in Romanian
    quantity: item.quantity,
    price: parseFloat(item.price),
    vatPercentage: 0, // Reverse charge
    currency: 'EUR'
  }));

  // Format dates
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days later

  return {
    companyVat: config.companyVat,
    seriesName,
    client,
    issueDate,
    dueDate,
    products,
    language: 'RO',
    currency: 'EUR',
    precision: 2,
    mentions: 'Reverse charge – Article 196 of Council Directive 2006/112/EC',
    sendEmail: true
  };
}