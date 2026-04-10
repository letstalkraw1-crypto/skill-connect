/**
 * OAuth Configuration Test Script
 * Run this to verify your OAuth setup is correct
 */

require('dotenv').config();

console.log('\n🔍 OAuth Configuration Check\n');
console.log('=' .repeat(50));

// Check environment variables
const checks = [
  { name: 'BACKEND_URL', value: process.env.BACKEND_URL, required: true },
  { name: 'FRONTEND_URL', value: process.env.FRONTEND_URL, required: true },
  { name: 'GITHUB_CLIENT_ID', value: process.env.GITHUB_CLIENT_ID, required: true },
  { name: 'GITHUB_CLIENT_SECRET', value: process.env.GITHUB_CLIENT_SECRET, required: true, masked: true },
  { name: 'REDIS_URL', value: process.env.REDIS_URL, required: true },
  { name: 'MONGO_URI', value: process.env.MONGO_URI, required: true, masked: true },
  { name: 'JWT_SECRET', value: process.env.JWT_SECRET, required: true, masked: true },
];

let allPassed = true;

checks.forEach(check => {
  const status = check.value ? '✅' : '❌';
  const displayValue = check.masked && check.value 
    ? check.value.substring(0, 10) + '...' 
    : check.value || 'NOT SET';
  
  console.log(`${status} ${check.name}: ${displayValue}`);
  
  if (check.required && !check.value) {
    allPassed = false;
  }
});

console.log('=' .repeat(50));

// Test OAuth provider registry
console.log('\n🔧 Testing OAuth Provider Registry...\n');

try {
  const { getProvider, getAllProviders } = require('./src/services/oauthProviderRegistry');
  
  const githubProvider = getProvider('github');
  if (githubProvider) {
    console.log('✅ GitHub provider configured');
    console.log(`   - Display Name: ${githubProvider.displayName}`);
    console.log(`   - Auth URL: ${githubProvider.authUrl}`);
    console.log(`   - Callback: ${githubProvider.callbackPath}`);
  } else {
    console.log('❌ GitHub provider not configured properly');
    allPassed = false;
  }
  
  const allProviders = getAllProviders();
  console.log(`\n📊 Total enabled providers: ${allProviders.length}`);
  allProviders.forEach(p => {
    console.log(`   - ${p.displayName} (${p.name})`);
  });
  
} catch (error) {
  console.log('❌ Error loading OAuth provider registry:', error.message);
  allPassed = false;
}

// Test Redis connection
console.log('\n🔴 Testing Redis Connection...\n');

const { redisClient } = require('./src/config/redis');

redisClient.ping()
  .then(() => {
    console.log('✅ Redis connection successful');
    
    // Test OAuth URLs
    console.log('\n🌐 OAuth URLs:\n');
    console.log(`Initiate: ${process.env.BACKEND_URL}/api/auth/oauth/github`);
    console.log(`Callback: ${process.env.BACKEND_URL}/api/auth/oauth/github/callback`);
    console.log(`Frontend: ${process.env.FRONTEND_URL}/auth/callback`);
    
    console.log('\n' + '='.repeat(50));
    
    if (allPassed) {
      console.log('\n✅ All checks passed! OAuth is ready to use.\n');
      console.log('🚀 Next steps:');
      console.log('   1. Start backend: npm run dev');
      console.log('   2. Start frontend: cd ../frontend && npm run dev');
      console.log('   3. Test OAuth: http://localhost:5000/api/auth/oauth/github\n');
    } else {
      console.log('\n❌ Some checks failed. Please fix the issues above.\n');
    }
    
    process.exit(allPassed ? 0 : 1);
  })
  .catch(err => {
    console.log('❌ Redis connection failed:', err.message);
    console.log('\n⚠️  Make sure Redis is running:');
    console.log('   - macOS: brew services start redis');
    console.log('   - Ubuntu: sudo systemctl start redis');
    console.log('   - Docker: docker run -d -p 6379:6379 redis\n');
    process.exit(1);
  });
