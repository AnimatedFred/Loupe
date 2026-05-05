import fs from 'fs';
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
console.log(`Count: ${data.count}`);
console.log(`Page: ${data.page?.url}`);
console.log(`Title: ${data.page?.title}`);
const elementTypes = data.elements.reduce((acc, el) => {
  acc[el.tagName] = (acc[el.tagName] || 0) + 1;
  return acc;
}, {});
console.log('Element Types:', JSON.stringify(elementTypes, null, 2));
