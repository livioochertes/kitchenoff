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

  /**
   * Get product stock from Smartbill
   */
  async getProductStock(companyVat: string, productCode?: string): Promise<any[]> {
    try {
      const url = productCode 
        ? `${this.baseUrl}/stocks?cif=${companyVat}&productCode=${productCode}`
        : `${this.baseUrl}/stocks?cif=${companyVat}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get product stock: ${response.status}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('Error getting product stock:', error);
      return [];
    }
  }

  /**
   * Update product stock in Smartbill
   */
  async updateProductStock(companyVat: string, stockUpdates: {
    productCode: string;
    quantity: number;
    operation: 'add' | 'subtract' | 'set';
    warehouseCode?: string;
    documentType?: string;
    documentSeries?: string;
    documentNumber?: string;
    notes?: string;
  }[]): Promise<boolean> {
    try {
      console.log('Updating Smartbill stock:', JSON.stringify(stockUpdates, null, 2));
      
      const response = await fetch(`${this.baseUrl}/stocks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cif: companyVat,
          stockMovements: stockUpdates
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smartbill stock update error:', response.status, errorText);
        throw new Error(`Smartbill stock update failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Smartbill stock updated successfully:', result);
      return true;
    } catch (error) {
      console.error('Error updating Smartbill stock:', error);
      return false;
    }
  }

  /**
   * Get products from Smartbill
   */
  async getProducts(companyVat: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products?cif=${companyVat}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get products: ${response.status}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting products from Smartbill:', error);
      return [];
    }
  }

  /**
   * Create or update product in Smartbill
   */
  async createOrUpdateProduct(companyVat: string, productData: {
    name: string;
    code: string;
    um: string;
    price?: number;
    currency?: string;
    vatPercentage?: number;
    category?: string;
    description?: string;
    barcode?: string;
  }): Promise<any> {
    try {
      console.log('Creating/updating Smartbill product:', JSON.stringify(productData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          cif: companyVat,
          ...productData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smartbill product creation error:', response.status, errorText);
        throw new Error(`Smartbill product creation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Smartbill product created/updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating/updating Smartbill product:', error);
      throw error;
    }
  }

  /**
   * Sync all products from local database to Smartbill
   */
  async syncProductsToSmartbill(companyVat: string, products: any[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`Starting sync of ${products.length} products to Smartbill...`);

    for (const product of products) {
      try {
        await this.createOrUpdateProduct(companyVat, {
          name: product.name,
          code: product.productCode || product.id.toString(),
          um: 'buc', // pieces in Romanian
          price: parseFloat(product.price || '0'),
          currency: 'EUR',
          vatPercentage: parseFloat(product.vatValue || '0'),
          category: product.category?.name || 'General',
          description: product.description || '',
          barcode: product.productCode || ''
        });

        results.success++;
        console.log(`✓ Synced product: ${product.name}`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to sync "${product.name}": ${errorMessage}`);
        console.error(`✗ Failed to sync product "${product.name}":`, error);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Product sync completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Sync stock levels from Smartbill to local database
   */
  async syncStockFromSmartbill(companyVat: string, productMappings: Map<string, number>): Promise<{
    success: number;
    failed: number;
    errors: string[];
    stockUpdates: Array<{ productId: number; oldStock: number; newStock: number; productCode: string; }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      stockUpdates: [] as Array<{ productId: number; oldStock: number; newStock: number; productCode: string; }>
    };

    try {
      console.log('Fetching stock levels from Smartbill...');
      const stockData = await this.getProductStock(companyVat);

      for (const stockItem of stockData) {
        try {
          const productCode = stockItem.productCode || stockItem.code;
          const productId = productMappings.get(productCode);
          
          if (!productId) {
            console.log(`No mapping found for product code: ${productCode}`);
            continue;
          }

          const newStock = parseInt(stockItem.quantity || stockItem.stock || '0');
          
          // Here you would update your local database stock
          // This is a placeholder - you'll need to implement the actual database update
          results.stockUpdates.push({
            productId,
            oldStock: 0, // You'd get this from your database
            newStock,
            productCode
          });

          results.success++;
          console.log(`✓ Updated stock for product ${productCode}: ${newStock}`);
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push(`Failed to update stock for ${stockItem.productCode}: ${errorMessage}`);
        }
      }

    } catch (error) {
      console.error('Error syncing stock from Smartbill:', error);
      results.errors.push(`Failed to fetch stock data: ${error}`);
    }

    console.log(`Stock sync completed: ${results.success} success, ${results.failed} failed`);
    return results;
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
  console.log('🔧 Converting order to Smartbill format:', {
    orderId: order.id,
    userEmail: user.email,
    seriesName: seriesName,
    itemCount: order.items?.length || 0
  });

  // Format client data with proper address mapping
  const client: SmartbillClient = {
    name: user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
    email: user.email,
    address: order.billingAddress?.address || order.shippingAddress?.address || 'Address not provided',
    city: order.billingAddress?.city || order.shippingAddress?.city || 'City not provided',
    country: order.billingAddress?.country || order.shippingAddress?.country || 'Romania',
    phone: user.billingPhone || order.billingAddress?.phone || order.shippingAddress?.phone || '+40123456789',
    contact: user.companyName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
    vatCode: user.vatNumber || '', // Can be empty for B2C
    regCom: user.registrationNumber || '', // Can be empty for B2C
  };

  // Format products using product-specific currency and VAT settings
  const products: SmartbillProduct[] = order.items.map((item: any) => {
    const productVatPercentage = parseFloat(item.product.vatPercentage || '0');
    const productCurrency = item.product.currency || 'EUR';
    const isReverseCharge = productVatPercentage === 0;
    
    console.log(`📦 Product ${item.product.name}: VAT=${productVatPercentage}%, Currency=${productCurrency}, ReverseCharge=${isReverseCharge}`);
    
    return {
      name: item.product.name,
      code: item.product.productCode || `KO-${item.productId}`,
      isDiscount: false,
      measuringUnitName: 'buc',
      currency: productCurrency,
      quantity: item.quantity,
      price: parseFloat(item.price),
      isTaxIncluded: !isReverseCharge, // Include tax if not reverse charge
      taxName: isReverseCharge ? 'Scutit' : 'Normala',
      taxPercentage: productVatPercentage,
      vatPercentage: productVatPercentage,
      vatAmount: isReverseCharge ? 0 : (parseFloat(item.price) * item.quantity * productVatPercentage / 100),
      saveToDb: false,
      isService: false
    };
  });

  console.log('📋 Smartbill client data:', client);
  console.log('📦 Smartbill products data:', products);

  // Format dates
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const invoiceData = {
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
    sendEmail: false // Don't auto-send email, let user decide
  };

  console.log('✅ Final Smartbill invoice data:', JSON.stringify(invoiceData, null, 2));
  return invoiceData;
}