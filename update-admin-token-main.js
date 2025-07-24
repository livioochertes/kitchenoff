// Script to update admin token with MAIN authentication system token
// Copy and paste this in the browser console while on the admin page

console.log('🔧 Updating admin token with main system credentials...');

// Set the main system admin token (works with /api routes)
const mainSystemToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTA0MSwiZW1haWwiOiJhZG1pbkBraXRjaGVuLW9mZi5jb20iLCJpYXQiOjE3NTMzNTYzNDgsImV4cCI6MTc1MzQ0Mjc0OH0.2PDmp4r0kY6X_OggsQMt7dgnvIZXM81MfEt0bYSTZR8";
const adminUser = {
  id: 1041,
  email: "admin@kitchen-off.com",
  firstName: "Admin",
  lastName: "User",
  isAdmin: true
};

// Update localStorage with main system token
localStorage.setItem('adminToken', mainSystemToken);
localStorage.setItem('adminUser', JSON.stringify(adminUser));

console.log('✅ Main system admin token updated successfully!');
console.log('🔄 Please refresh the page to see the updated orders with AWB buttons');
console.log('📋 Look for orders with "processing" status - they will have a purple 🚛 Generate AWB button');

// Optionally reload the page
setTimeout(() => {
  window.location.reload();
}, 1000);