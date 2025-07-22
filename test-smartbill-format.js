// Test different date formats and field structures for Smartbill
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

// Test with simpler date format
const testPayload1 = {
  cif: smartbillCredentials.companyVat,
  client: {
    name: "Test Customer",
    address: "Test Address",
    city: "Bucharest"
  },
  issueDate: "22-01-2025", // Different date format
  seriesName: "KTO",
  products: [
    {
      name: "Test Product",
      code: "TEST-001",
      measuringUnitName: "buc",
      currency: "RON", 
      quantity: 1,
      price: 100.0,
      taxPercentage: 19
    }
  ]
};

console.log('🧪 Testing simplified payload format...');
console.log('Payload:', JSON.stringify(testPayload1, null, 2));

fetch(`${baseUrl}/invoice`, {
  method: 'POST', 
  headers: getAuthHeaders(),
  body: JSON.stringify(testPayload1)
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(data => {
  console.log('Response body length:', data.length);
  if (data.length < 1000) {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Parsed response:', parsed);
    } catch (e) {
      console.log('Raw response:', data);
    }
  } else {
    console.log('HTML error response (truncated):', data.substring(0, 200) + '...');
  }
})
.catch(error => {
  console.error('Request error:', error);
});