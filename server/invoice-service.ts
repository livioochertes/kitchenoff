import { SmartbillAPI, SmartbillConfig, orderToSmartbillInvoice } from './smartbill-api.js';
import { storage } from './storage.js';

export interface InvoiceServiceConfig {
  smartbill: SmartbillConfig;
  defaultSeries: string;
  enableSmartbill: boolean;
}

export class InvoiceService {
  private smartbillApi: SmartbillAPI;
  private config: InvoiceServiceConfig;

  constructor(config: InvoiceServiceConfig) {
    this.config = config;
    this.smartbillApi = new SmartbillAPI(config.smartbill);
  }

  /**
   * Test connection to Smartbill API
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.enableSmartbill) {
      console.log('Smartbill integration disabled');
      return false;
    }

    return await this.smartbillApi.testConnection();
  }

  /**
   * Generate invoice automatically after payment completion
   */
  async generateInvoiceAfterPayment(orderId: number, paymentData: any): Promise<any> {
    try {
      console.log(`Starting automatic invoice generation for order ${orderId}`);
      
      // Get order details with items and user
      const order = await storage.getOrder(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Get user details
      const user = await storage.getUser(order.userId);
      if (!user) {
        throw new Error(`User ${order.userId} not found`);
      }

      // Update order status to 'paid' if payment successful
      if (paymentData.status === 'completed' || paymentData.status === 'succeeded') {
        await storage.updateOrder(orderId, { 
          paymentStatus: 'paid',
          status: 'processing' 
        });
      }

      let invoice;

      if (this.config.enableSmartbill) {
        // Generate invoice via Smartbill API
        invoice = await this.generateSmartbillInvoice(order, user, paymentData);
      } else {
        // Fallback to local invoice generation
        invoice = await this.generateLocalInvoice(order, user, paymentData);
      }

      console.log(`Invoice generated successfully for order ${orderId}:`, invoice);
      return invoice;

    } catch (error) {
      console.error(`Error generating invoice for order ${orderId}:`, error);
      
      // If Smartbill fails, try local generation as fallback
      if (this.config.enableSmartbill && error.message.includes('Smartbill')) {
        console.log('Smartbill failed, falling back to local invoice generation');
        try {
          const order = await storage.getOrder(orderId);
          const user = await storage.getUser(order.userId);
          return await this.generateLocalInvoice(order, user, paymentData);
        } catch (fallbackError) {
          console.error('Fallback invoice generation also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate invoice via Smartbill API
   */
  private async generateSmartbillInvoice(order: any, user: any, paymentData: any): Promise<any> {
    try {
      // Convert order to Smartbill format
      const smartbillInvoiceData = orderToSmartbillInvoice(
        order,
        user,
        this.config.smartbill,
        this.config.defaultSeries
      );

      // Create invoice via Smartbill API
      const smartbillResult = await this.smartbillApi.createInvoice(smartbillInvoiceData);

      // Store invoice reference in local database
      const invoiceData = {
        invoiceNumber: `${smartbillResult.series}-${smartbillResult.number}`,
        orderId: order.id,
        userId: order.userId,
        issueDate: new Date(),
        supplyDate: new Date(),
        subtotal: order.totalAmount,
        vatAmount: '0.00',
        totalAmount: order.totalAmount,
        currency: 'EUR',
        paymentMethod: paymentData.paymentMethod || 'card',
        paymentLink: null,
        notes: 'Generated via Smartbill API - Reverse charge Article 196',
        smartbillSeries: smartbillResult.series,
        smartbillNumber: smartbillResult.number,
        smartbillId: smartbillResult.id,
        status: 'issued'
      };

      // Create invoice items for local storage
      const invoiceItems = order.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.productCode || null,
        quantity: item.quantity,
        unitPrice: item.price,
        vatRate: '0.00',
        lineTotal: item.totalPrice,
      }));

      const localInvoice = await storage.createInvoice(invoiceData, invoiceItems);

      return {
        ...localInvoice,
        smartbillData: smartbillResult,
        pdfUrl: smartbillResult.url || null
      };

    } catch (error) {
      console.error('Smartbill invoice generation failed:', error);
      throw new Error(`Smartbill invoice generation failed: ${error.message}`);
    }
  }

  /**
   * Generate invoice locally (fallback method)
   */
  private async generateLocalInvoice(order: any, user: any, paymentData: any): Promise<any> {
    try {
      // Generate unique invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Calculate totals
      const subtotal = parseFloat(order.totalAmount);
      const vatRate = 0; // 0% VAT as per reverse charge
      const vatAmount = (subtotal * vatRate) / 100;
      const totalAmount = subtotal + vatAmount;

      // Create invoice
      const invoiceData = {
        invoiceNumber,
        orderId: order.id,
        userId: order.userId,
        issueDate: new Date(),
        supplyDate: new Date(),
        subtotal: subtotal.toString(),
        vatAmount: vatAmount.toString(),
        totalAmount: totalAmount.toString(),
        currency: 'EUR',
        paymentMethod: paymentData.paymentMethod || 'card',
        paymentLink: null,
        notes: 'Reverse charge – Article 196 of Council Directive 2006/112/EC',
        status: 'issued'
      };

      // Create invoice items
      const invoiceItems = order.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.productCode || null,
        quantity: item.quantity,
        unitPrice: item.price,
        vatRate: '0.00',
        lineTotal: item.totalPrice,
      }));

      const invoice = await storage.createInvoice(invoiceData, invoiceItems);
      
      // Get the full invoice with items for response
      const fullInvoice = await storage.getInvoice(invoice.id);
      
      return fullInvoice;

    } catch (error) {
      console.error('Local invoice generation failed:', error);
      throw error;
    }
  }

  /**
   * Get invoice PDF (from Smartbill if available)
   */
  async getInvoicePdf(invoiceId: number): Promise<Buffer | null> {
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // If invoice has Smartbill data, get PDF from Smartbill
      if (invoice.smartbillSeries && invoice.smartbillNumber && this.config.enableSmartbill) {
        return await this.smartbillApi.getInvoicePdf(
          this.config.smartbill.companyVat,
          invoice.smartbillSeries,
          invoice.smartbillNumber
        );
      }

      // Otherwise return null (local invoice handling would need separate PDF generation)
      return null;

    } catch (error) {
      console.error('Error getting invoice PDF:', error);
      return null;
    }
  }

  /**
   * Send invoice by email
   */
  async sendInvoiceByEmail(invoiceId: number, recipientEmail?: string): Promise<boolean> {
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const email = recipientEmail || invoice.user.email;
      
      if (invoice.smartbillSeries && invoice.smartbillNumber && this.config.enableSmartbill) {
        await this.smartbillApi.sendInvoiceByEmail(
          this.config.smartbill.companyVat,
          invoice.smartbillSeries,
          invoice.smartbillNumber,
          email,
          `Invoice ${invoice.invoiceNumber} from KitchenOff`,
          'Please find attached your invoice. Thank you for your business!'
        );
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error sending invoice by email:', error);
      return false;
    }
  }

  /**
   * Check if invoice is paid via Smartbill
   */
  async checkInvoicePaymentStatus(invoiceId: number): Promise<boolean> {
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return false;
      }

      if (invoice.smartbillSeries && invoice.smartbillNumber && this.config.enableSmartbill) {
        return await this.smartbillApi.isInvoicePaid(
          this.config.smartbill.companyVat,
          invoice.smartbillSeries,
          invoice.smartbillNumber
        );
      }

      // For local invoices, check payment status from order
      const order = await storage.getOrder(invoice.orderId);
      return order?.paymentStatus === 'paid';

    } catch (error) {
      console.error('Error checking invoice payment status:', error);
      return false;
    }
  }
}

// Initialize invoice service with configuration
export function createInvoiceService(): InvoiceService {
  const config: InvoiceServiceConfig = {
    smartbill: {
      username: process.env.SMARTBILL_USERNAME || '',
      token: process.env.SMARTBILL_TOKEN || '',
      companyVat: process.env.SMARTBILL_COMPANY_VAT || 'RO12345678', // Default Romanian VAT format
    },
    defaultSeries: process.env.SMARTBILL_SERIES || 'FACT',
    enableSmartbill: process.env.ENABLE_SMARTBILL === 'true'
  };

  return new InvoiceService(config);
}