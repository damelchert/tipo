#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === 'account' && args[1] === 'status') {
  console.log(JSON.stringify({ subscription_plan_type: 'test', credits: 999 }));
  process.exit(0);
}

if (args[0] === 'auth' && args[1] === 'login') {
  const delay = Number(process.env.MOCK_HIGGSFIELD_AUTH_DELAY_MS || 0);
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  process.exit(0);
}

if (args[0] === 'generate' && args[1] === 'create') {
  if (args.includes('--batch_size')) {
    console.error('Parameter batch_size does not exist in the current GPT Image 2 contract');
    process.exit(2);
  }
  if (process.env.MOCK_HIGGSFIELD_GENERATE_ERROR === 'oauth-json') {
    console.error('{"access_token":"fixture-access-secret","refresh_token":"fixture-refresh-secret","state":"fixture-state-secret"}');
    process.exit(3);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(JSON.stringify([{
    id: `mock-${process.pid}`,
    status: 'completed',
    result_url: `https://d8j0ntlcm91z4.cloudfront.net/mock-${process.pid}.png`,
  }]));
  process.exit(0);
}

console.error('mock: comando inesperado');
process.exit(2);
