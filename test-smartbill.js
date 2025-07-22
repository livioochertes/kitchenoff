// Test Smartbill integration directly
import dotenv from 'dotenv';
import { createInvoiceService } from './server/invoice-service.js';
import { SmartbillAPI } from './server/smartbill-api.js';

// Load environment variables
dotenv.config();

async function testSmartbill() {
  console.log('🧪 Testing Smartbill Integration...');
  
  // Test invoice data structure with corrected RON/19% VAT format
  const testOrder = {
    id: 1384,
    userId: 870,
    totalAmount: '124.98',
    items: [{
      productId: 12714,
      quantity: 1,
      price: '124.98',
      totalPrice: '124.98',
      product: {
        id: 12714,
        name: 'All-Purpose Cleaner - Gallon',
        currency: 'RON',
        vatPercentage: '19.00',
        productCode: 'KO-CLEANER-1GAL'
      }
    }],
    billingAddress: {
      address: 'Calea Mosilor 158',
      city: 'Bucharest',
      country: 'Romania',
      phone: '+40740000520'
    }
  };
  
  const testUser = {
    id: 870,
    email: 'liviu.chertes@gmail.com',
    firstName: 'Liviu',
    lastName: 'Chertes',
    companyName: 'Namarte CCL SRL',
    vatNumber: 'RO16582983',
    registrationNumber: 'J40/13434/2019'
  };
  
  try {
    console.log('🔧 Creating invoice service...');
    const invoiceService = await createInvoiceService();
    
    console.log('📋 Creating Smartbill invoice with corrected format...');
    const result = await invoiceService.createInvoiceForOrder(testOrder, testUser, { paymentMethod: 'wire_transfer' });
    
    console.log('✅ INVOICE RESULT:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n🔍 TESTING SMARTBILL API DIRECTLY...');
    
    // Test Smartbill API with corrected payload structure
    try {
      const smartbillApi = new SmartbillAPI({
        username: process.env.SMARTBILL_USERNAME || 'liviu.chertes@gmail.com',
        token: process.env.SMARTBILL_TOKEN || 'your-token',
        companyVat: 'RO16582983',
        baseUrl: 'https://ws.smartbill.ro/SBORO/api'
      });
      
      // Correct payload format based on API docs
      const correctPayload = {
        companyVatCode: 'RO16582983',
        client: {
          name: 'Liviu Chertes',
          vatCode: '',
          regCom: '',
          address: 'Calea Mosilor 158',
          isTaxPayer: false,
          city: 'Bucharest',
          country: 'Romania',
          email: 'liviu.chertes@gmail.com'
        },
        issueDate: new Date().toISOString().split('T')[0],
        seriesName: 'KTO',
        isDraft: false,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mentions: 'Factura cu TVA 19% conform legislației române',
        observations: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        precision: 2,
        products: [{
          name: 'All-Purpose Cleaner - Gallon',
          code: 'KO-CLEANER-1GAL',
          isDiscount: false,
          measuringUnitName: 'buc',
          currency: 'RON',
          quantity: 1,
          price: 124.98,
          isTaxIncluded: true,
          taxName: 'Normala',
          taxPercentage: 19,
          isService: false,
          saveToDb: false
        }]
      };
      
      console.log('📤 Sending corrected payload:', JSON.stringify(correctPayload, null, 2));
      const directResult = await smartbillApi.createInvoice(correctPayload);
      console.log('✅ DIRECT SMARTBILL SUCCESS:', JSON.stringify(directResult, null, 2));
      
    } catch (directError) {
      console.error('❌ DIRECT SMARTBILL ERROR:', directError.message);
    }
  }
}

// Run test
testSmartbill().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});