// Test actual Smartbill API integration with detailed logging

const SMARTBILL_CONFIG = {
  baseUrl: 'https://ws.smartbill.ro/SBORO/api',
  username: 'liviu.chertes@gmail.com',
  token: '001|2af8fcdc3ea579cb7a81093ca404b31e',
  companyVat: 'RO16582983'
};

function getAuthHeader() {
  const credentials = `${SMARTBILL_CONFIG.username}:${SMARTBILL_CONFIG.token}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  return `Basic ${base64Credentials}`;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': getAuthHeader(),
  };
}

// Create test invoice data with HACCP product in RON - simplified format
const testInvoiceData = {
  companyVat: SMARTBILL_CONFIG.companyVat,
  seriesName: 'KTO',
  client: {
    name: 'Liviu Chertes',
    vatCode: '',
    regCom: '',
    address: 'Calea Mosilor 158',
    city: 'Bucharest',
    country: 'Romania'
  },
  issueDate: '2025-07-22',
  dueDate: '2025-08-21', 
  currency: 'RON',
  products: [
    {
      name: 'Set 8 role etichete xHACCP - TOP',
      code: '5944582004177',
      measuringUnitName: 'buc',
      currency: 'RON',
      quantity: 1,
      price: 105.88,
      isTaxIncluded: false,
      taxName: 'Normala',
      taxPercentage: 19
    }
  ]
};

// Also test with minimal format
const minimalInvoiceData = {
  companyVat: SMARTBILL_CONFIG.companyVat,
  seriesName: 'KTO',
  client: {
    name: 'Test Client',
    address: 'Test Address',
    city: 'Bucharest',
    country: 'Romania'
  },
  issueDate: '2025-07-22',
  currency: 'RON',
  products: [
    {
      name: 'Test Product',
      measuringUnitName: 'buc',
      quantity: 1,
      price: 100,
      isTaxIncluded: false,
      taxName: 'Normala',
      taxPercentage: 19
    }
  ]
};

async function testSmartbillInvoice() {
  console.log('🔍 TESTING ACTUAL SMARTBILL API INVOICE CREATION');
  console.log('================================================');
  
  try {
    // 1. Test connection first
    console.log('1. Testing connection to series endpoint...');
    const seriesUrl = `${SMARTBILL_CONFIG.baseUrl}/series?cif=${encodeURIComponent(SMARTBILL_CONFIG.companyVat)}`;
    const seriesResponse = await fetch(seriesUrl, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (seriesResponse.ok) {
      const seriesData = await seriesResponse.json();
      console.log('✅ Series endpoint working:', seriesData.list.filter(s => s.name === 'KTO'));
    } else {
      console.log('❌ Series endpoint failed:', seriesResponse.status);
      return;
    }
    
    // 2. Test invoice creation with simplified format
    console.log('\n2. Testing invoice creation with simplified format...');
    console.log('📋 Invoice data being sent:');
    console.log(JSON.stringify(testInvoiceData, null, 2));
    
    const invoiceUrl = `${SMARTBILL_CONFIG.baseUrl}/invoice`;
    let invoiceResponse = await fetch(invoiceUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(testInvoiceData)
    });
    
    console.log('\n📤 Response status:', invoiceResponse.status);
    
    if (!invoiceResponse.ok) {
      console.log('❌ Simplified format failed, trying minimal format...');
      
      // Try minimal format
      console.log('\n3. Testing minimal invoice format:');
      console.log(JSON.stringify(minimalInvoiceData, null, 2));
      
      invoiceResponse = await fetch(invoiceUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(minimalInvoiceData)
      });
    }
    
    console.log('\n📤 Response status:', invoiceResponse.status);
    console.log('📤 Response headers:', Object.fromEntries(invoiceResponse.headers.entries()));
    
    if (invoiceResponse.ok) {
      const result = await invoiceResponse.json();
      console.log('✅ SUCCESS! Invoice created in Smartbill:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await invoiceResponse.text();
      console.log('❌ Invoice creation failed:');
      console.log('Status:', invoiceResponse.status);
      console.log('Error:', errorText);
      
      // Analyze the error
      if (invoiceResponse.status === 500) {
        console.log('\n🔍 ANALYSIS: HTTP 500 suggests field validation issue');
        console.log('   Possible causes:');
        console.log('   - Invalid date format (should be YYYY-MM-DD)');
        console.log('   - Invalid VAT calculation');
        console.log('   - Missing required fields');
        console.log('   - Invalid series name');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
testSmartbillInvoice();