// Copy and paste this in your browser console on the admin page

(async function() {
  try {
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Token found:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.error('❌ No auth token found!');
      return;
    }
    
    console.log('🌐 Calling debug endpoint...');
    
    const response = await fetch('http://localhost:5000/chat/monitor/debug', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE STATE REPORT');
    console.log('='.repeat(60));
    
    if (data.summary) {
      console.log('\n📈 Summary:');
      console.log('  • Chat Table Count:', data.summary.chatTableCount);
      console.log('  • Message Table Count:', data.summary.messageTableCount);
      console.log('  • Unique ChatIds in Messages:', data.summary.uniqueChatIdsInMessages);
      console.log('  • Orphaned ChatIds (no Chat record):', data.summary.orphanedChatIds);
      console.log('  • Valid Chats (with user & seller):', data.summary.validChats);
      console.log('  • Chats with Null User:', data.summary.chatsWithNullUser);
      console.log('  • Chats with Null Seller:', data.summary.chatsWithNullSeller);
    }
    
    if (data.diagnosis) {
      console.log('\n🔍 Diagnosis:');
      console.log('  Issue:', data.diagnosis.issue);
      console.log('  Recommendation:', data.diagnosis.recommendation);
    }
    
    if (data.sampleChats && data.sampleChats.length > 0) {
      console.log('\n📋 Sample Chats (first few):');
      data.sampleChats.forEach((chat, i) => {
        console.log(`  ${i + 1}. Chat ID: ${chat.id}`);
        console.log(`     UserId: ${chat.userId}, SellerId: ${chat.sellerId}`);
        console.log(`     Has User: ${chat.hasUser}, Has Seller: ${chat.hasSeller}`);
        console.log(`     User Email: ${chat.userEmail || 'NULL'}`);
        console.log(`     Seller Email: ${chat.sellerEmail || 'NULL'}`);
      });
    }
    
    if (data.sampleMessages && data.sampleMessages.length > 0) {
      console.log('\n💬 Sample Messages (recent):');
      data.sampleMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. Message ID: ${msg.id}`);
        console.log(`     ChatId: ${msg.chatId}`);
        console.log(`     SenderId: ${msg.senderId}`);
        console.log(`     Content: ${msg.content?.substring(0, 50)}...`);
        console.log(`     Created: ${msg.createdAt}`);
      });
    }
    
    if (data.orphanedChatIds && data.orphanedChatIds.length > 0) {
      console.log('\n⚠️ Orphaned ChatIds (messages without Chat records):');
      data.orphanedChatIds.forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Full JSON Response:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

