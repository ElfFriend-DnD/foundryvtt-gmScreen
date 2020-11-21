var fs = require('fs');
console.log(JSON.parse(fs.readFileSync('./dist/module.json', 'utf8')).version);
