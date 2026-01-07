// Quick database connection test
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
    const chatCount = await prisma.chat.count();
    console.log(`📊 Chats in database: ${chatCount}`);
    
    const messageCount = await prisma.message.count();
    console.log(`📊 Messages in database: ${messageCount}`);
    
    await prisma.$disconnect();
    console.log('✅ Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection FAILED:');
    console.error('Error:', error.message);
    console.error('\n💡 Common fixes:');
    console.error('  1. Check MongoDB Atlas cluster is running (not paused)');
    console.error('  2. Check IP whitelist in MongoDB Atlas Network Access');
    console.error('  3. Verify connection string in .env file');
    console.error('  4. Check internet connection');
    process.exit(1);
  }
}

testConnection();

