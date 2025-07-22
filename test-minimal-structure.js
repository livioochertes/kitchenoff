// Test with ultra-minimal structure based on official docs
const smartbillCredentials = {
  username: 'liviu.chertes@gmail.com',
  token: '001|2af8fcdc3ea579cb7a81093ca404b31e',
  companyVat: 'RO16582983'
};

const baseUrl = 'https://ws.smartbill.ro/SBORO/api';

function getAuthHeaders() {
  const credentials = `${smartbillCredentials.username}:${smartbillCredentials.token}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${base64Credentials}`
  };
}

// Test with absolute minimal structure from docs
const minimalInvoice = {
  cif: smartbillCredentials.companyVat,
  client: {
    name: "Test Client",
    address: "Test Address",
    city: "Bucuresti",
    country: "Romania"
  },
  issueDate: "2025-01-22",
  seriesName: "KTO",
  products: [
    {
      name: "Test Product",
      code: "TEST001",
      measuringUnitName: "buc",
      currency: "RON",
      quantity: 1,
      price: 100.00,
      taxPercentage: 19
    }
  ]
};

console.log('🧪 Testing absolute minimal structure...');
console.log('Payload:', JSON.stringify(minimalInvoice, null, 2));

// First, let's check if we can get products from Smartbill
fetch(`${baseUrl}/products?cif=${smartbillCredentials.companyVat}`, {
  method: 'GET',
  headers: getAuthHeaders()
})
.then(response => {
  console.log('Products endpoint status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Products response:', data.substring(0, 200));
  
  // Now try the minimal invoice
  return fetch(`${baseUrl}/invoice`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(minimalInvoice)
  });
})
.then(response => {
  console.log('\nInvoice creation status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Invoice response length:', data.length);
  if (data.length < 1000) {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Parsed response:', parsed);
    } catch (e) {
      console.log('Raw response:', data);
    }
  } else {
    console.log('HTML error (truncated):', data.substring(0, 300));
  }
})
.catch(error => {
  console.error('Request error:', error);
});