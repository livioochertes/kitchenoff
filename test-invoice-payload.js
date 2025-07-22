// Test minimal invoice payload to Smartbill API
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

// Test minimal invoice payload
const minimalInvoicePayload = {
  cif: smartbillCredentials.companyVat,
  client: {
    name: "Test Customer",
    address: "Test Address",
    city: "Bucharest",
    country: "Romania"
  },
  issueDate: "2025-01-22",
  seriesName: "KTO",
  isDraft: false,
  products: [
    {
      name: "Test Product",
      code: "TEST-001",
      isDiscount: false,
      measuringUnitName: "buc",
      currency: "RON",
      quantity: 1,
      price: 100,
      isTaxIncluded: true,
      taxName: "Normala",
      taxPercentage: 19,
      vatPercentage: 19,
      saveToDb: false,
      isService: false
    }
  ]
};

console.log('🧪 Testing minimal Smartbill invoice payload...');
console.log('Payload:', JSON.stringify(minimalInvoicePayload, null, 2));

fetch(`${baseUrl}/invoice`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(minimalInvoicePayload)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.text();
})
.then(data => {
  try {
    const parsed = JSON.parse(data);
    console.log('✅ Success:', parsed);
  } catch (e) {
    console.log('❌ Raw response:', data);
  }
})
.catch(error => {
  console.error('Error:', error);
});