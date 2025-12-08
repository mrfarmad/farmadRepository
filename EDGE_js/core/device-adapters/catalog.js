const { Kub1063Adapter } = require('./kub1063');
const { Kub1112Adapter } = require('./kub1112');

function adapterFor(device) {
  switch ((device.type || '').toLowerCase()) {
    case 'kub-1063':
    case 'kub1063':
      return new Kub1063Adapter(device);
    case 'kub-1112':
    case 'kub1112':
      return new Kub1112Adapter(device);
    default:
      return null;
  }
}

module.exports = { adapterFor };
