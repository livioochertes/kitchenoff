// Debug Smartbill API directly with correct credentials
const username = 'liviu.chertes@gmail.com';
const token = '001|2af8fcdc3ea579cb7a81093ca404b31e';
const companyVat = 'RO16582983';

console.log('🔍 Debugging Smartbill API...');
console.log('Environment variables:');
console.log('  USERNAME:', username ? `${username.slice(0, 5)}...` : 'NOT SET');
console.log('  TOKEN:', token ? `${token.slice(0, 10)}...` : 'NOT SET');
console.log('  COMPANY_VAT:', companyVat);
console.log('  ENABLE_SMARTBILL:', process.env.ENABLE_SMARTBILL);
console.log('  SMARTBILL_SERIES:', process.env.SMARTBILL_SERIES);

// Test basic authentication
async function testAuth() {
  const auth = Buffer.from(`${username}:${token}`).toString('base64');
  
  console.log('\n📡 Testing Smartbill API authentication...');
  
  try {
    const response = await fetch(`https://ws.smartbill.ro/SBORO/api/series?cif=${companyVat}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText.slice(0, 500));
    } else {
      const data = await response.json();
      console.log('Success! Available series:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testAuth();