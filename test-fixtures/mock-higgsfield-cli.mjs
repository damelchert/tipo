#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === 'account' && args[1] === 'status') {
  console.log(JSON.stringify({ subscription_plan_type: 'test', credits: 999 }));
  process.exit(0);
}

if (args[0] === 'generate' && args[1] === 'create') {
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
