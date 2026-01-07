// Quick script to test the debug endpoint
// Run this in browser console on your admin dashboard page

(async function testDebugEndpoint() {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ No auth token found in localStorage');
      console.log('Please log in first, or check if token is stored under a different key');
      return;
    }
    
    console.log('🔑 Token found:', token.substring(0, 50) + '...');
    console.log('🌐 Calling debug endpoint...');
    
    const response = await fetch('http://localhost:5000/chat/monitor/debug', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }
    
    const data = await response.json();
    
    // Pretty print the response
    console.log('✅ Debug Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Extract key information
    if (data.summary) {
      console.log('\n📋 Summary:');
      console.log(`  Total Chats: ${data.summary.chatTableCount}`);
      console.log(`  Total Messages: ${data.summary.messageTableCount}`);
      console.log(`  Valid Chats: ${data.summary.validChats}`);
      console.log(`  Chats with Null User: ${data.summary.chatsWithNullUser}`);
      console.log(`  Chats with Null Seller: ${data.summary.chatsWithNullSeller}`);
      
      if (data.diagnosis) {
        console.log('\n🔍 Diagnosis:');
        console.log(`  Issue: ${data.diagnosis.issue}`);
        console.log(`  Recommendation: ${data.diagnosis.recommendation}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error calling debug endpoint:', error);
  }
})();

