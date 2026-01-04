#!/usr/bin/env node

console.log('\x1b[33m%s\x1b[0m', '⚠️  이 패키지(openapi-rq)는 더 이상 유지보수되지 않습니다.');
console.log('\x1b[33m%s\x1b[0m', '⚠️  This package is deprecated.');
console.log('');
console.log('\x1b[36m%s\x1b[0m', '👉 대신 oprq를 사용해주세요 / Please use oprq instead:');
console.log('\x1b[36m%s\x1b[0m', '   npm install -g oprq');
console.log('');
console.log('   GitHub: https://github.com/1394ysh/oprq');
console.log('   npm: https://www.npmjs.com/package/oprq');

process.exit(1);
