// Test invoice creation with existing Smartbill product
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

// Test invoice with existing product in Smartbill
const testInvoiceWithExistingProduct = {
  companyVatCode: smartbillCredentials.companyVat,
  client: {
    name: "Test Customer - Existing Product",
    address: "Test Address 123",
    city: "Bucharest",
    country: "Romania",
    email: "test@example.com",
    isTaxPayer: false,
    saveToDb: true
  },
  issueDate: "2025-01-22",
  seriesName: "KTO",
  isDraft: false,
  dueDate: "2025-02-22",
  mentions: "Test with existing product",
  observations: "",
  deliveryDate: "2025-01-22",
  precision: 2,
  products: [
    {
      name: "Set 8 role etichete xHACCP - TOP",
      code: "5944582004177",
      isDiscount: false,
      measuringUnitName: "cut", // Using "cut" as specified
      currency: "RON",
      quantity: 1,
      price: 250.00,
      isTaxIncluded: true,
      taxName: "Normala",
      taxPercentage: 19,
      vatPercentage: 19,
      saveToDb: false, // Since product already exists
      isService: false
    }
  ]
};

console.log('🧪 Testing invoice with EXISTING Smartbill product...');
console.log('Product: Set 8 role etichete xHACCP - TOP (Code: 5944582004177)');
console.log('Payload:', JSON.stringify(testInvoiceWithExistingProduct, null, 2));

fetch(`${baseUrl}/invoice`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(testInvoiceWithExistingProduct)
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(data => {
  console.log('Response body length:', data.length);
  if (data.length < 2000) {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ SUCCESS! Invoice created:', parsed);
    } catch (e) {
      console.log('Raw response:', data);
    }
  } else {
    console.log('HTML error response (truncated):', data.substring(0, 300) + '...');
  }
})
.catch(error => {
  console.error('Request error:', error);
});