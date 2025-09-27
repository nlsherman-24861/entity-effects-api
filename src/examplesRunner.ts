import { runExample, setupEventListeners } from './examples';

function main(): void {
  console.log('🚀 Entity Effects API Examples');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  setupEventListeners();
  runExample();

  console.log('='.repeat(60));
  console.log('✅ Examples completed successfully!');
}

main();

