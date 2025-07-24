// Script to update admin token in browser localStorage
// Copy and paste this in the browser console while on the admin page

console.log('🔧 Updating admin token...');

// Set the fresh admin token
const freshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoxMDQxLCJpYXQiOjE3NTMzNTU5ODYsImV4cCI6MTc1MzQ0MjM4Nn0.QB0X3ZEWNAe0vIrnBqMAbbbewIb8G4dIvtQoXrBMfDQ";
const adminUser = {
  id: 1041,
  email: "admin@kitchen-off.com",
  firstName: "Admin",
  lastName: "User",
  twoFactorEnabled: false
};

// Update localStorage
localStorage.setItem('adminToken', freshToken);
localStorage.setItem('adminUser', JSON.stringify(adminUser));

console.log('✅ Admin token updated successfully!');
console.log('🔄 Please refresh the page to see the updated orders with AWB buttons');

// Optionally reload the page
setTimeout(() => {
  window.location.reload();
}, 1000);