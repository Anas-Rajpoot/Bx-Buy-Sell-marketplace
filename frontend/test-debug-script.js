// Copy and paste this ENTIRE script in your browser console
// It will show all the debug information clearly

(async function() {
  try {
    console.log('🔍 Starting debug endpoint check...');
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ No auth token found in localStorage');
      return;
    }
    
    console.log('✅ Token found, calling endpoint...');
    
    const response = await fetch('http://localhost:5000/chat/monitor/debug', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    // Show formatted output
    console.log('\n' + '='.repeat(70));
    console.log('📊 DATABASE DEBUG REPORT');
    console.log('='.repeat(70));
    
    if (data.error) {
      console.error('❌ ERROR:', data.error);
      if (data.stack) {
        console.error('Stack:', data.stack);
      }
      return;
    }
    
    if (data.summary) {
      console.log('\n📈 SUMMARY:');
      console.log('  ┌─────────────────────────────────────┬─────────┐');
      console.log('  │ Metric                              │ Value   │');
      console.log('  ├─────────────────────────────────────┼─────────┤');
      console.log('  │ Chat Table Count                    │', String(data.summary.chatTableCount).padEnd(7), '│');
      console.log('  │ Message Table Count                 │', String(data.summary.messageTableCount).padEnd(7), '│');
      console.log('  │ Unique ChatIds in Messages          │', String(data.summary.uniqueChatIdsInMessages).padEnd(7), '│');
      console.log('  │ Orphaned ChatIds (no Chat record)   │', String(data.summary.orphanedChatIds).padEnd(7), '│');
      console.log('  │ Valid Chats (with user & seller)    │', String(data.summary.validChats).padEnd(7), '│');
      console.log('  │ Chats with Null User                │', String(data.summary.chatsWithNullUser).padEnd(7), '│');
      console.log('  │ Chats with Null Seller              │', String(data.summary.chatsWithNullSeller).padEnd(7), '│');
      console.log('  └─────────────────────────────────────┴─────────┘');
    }
    
    if (data.diagnosis) {
      console.log('\n🔍 DIAGNOSIS:');
      console.log('  Issue:', data.diagnosis.issue);
      console.log('  Recommendation:', data.diagnosis.recommendation);
    }
    
    if (data.orphanedChatIds && data.orphanedChatIds.length > 0) {
      console.log('\n⚠️ ORPHANED CHAT IDs (Messages exist but no Chat record):');
      data.orphanedChatIds.forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });
      console.log(`  \n  💡 There are ${data.orphanedChatIds.length} chatIds in messages that don't have Chat records.`);
      console.log('  💡 The system should auto-create Chat records on next monitor request.');
    }
    
    if (data.sampleMessages && data.sampleMessages.length > 0) {
      console.log('\n💬 SAMPLE MESSAGES (recent 5):');
      data.sampleMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. Message ID: ${msg.id}`);
        console.log(`     ChatId: ${msg.chatId}`);
        console.log(`     SenderId: ${msg.senderId}`);
        console.log(`     Content: ${(msg.content || '').substring(0, 50)}...`);
      });
    }
    
    if (data.sampleChats && data.sampleChats.length > 0) {
      console.log('\n📋 SAMPLE CHATS (first 5):');
      data.sampleChats.forEach((chat, i) => {
        console.log(`  ${i + 1}. Chat ID: ${chat.id}`);
        console.log(`     UserId: ${chat.userId}, SellerId: ${chat.sellerId}`);
        console.log(`     Has User: ${chat.hasUser}, Has Seller: ${chat.hasSeller}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 Full JSON Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(70));
    
    // Return key findings
    const findings = {
      chatTableCount: data.summary?.chatTableCount || 0,
      messageTableCount: data.summary?.messageTableCount || 0,
      orphanedChatIds: data.summary?.orphanedChatIds || 0,
      validChats: data.summary?.validChats || 0,
      issue: data.diagnosis?.issue || 'Unknown',
    };
    
    console.log('\n🎯 KEY FINDINGS:', findings);
    
    return findings;
    
  } catch (error) {
    console.error('❌ Exception occurred:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
})();

