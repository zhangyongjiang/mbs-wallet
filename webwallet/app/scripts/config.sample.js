'use strict';

angular.module('webwalletApp').constant('config', {
  // show debug information in the interface
  debug: false,

  bridge: {
    // address that the bridge is available on
    url: 'https://localback.net:21324',

    // address of the bridge configuration file
    configUrl: '/data/plugin/config_signed.bin',

    // minimal version of bridge this wallet supports
    pluginMinVersion: '1.0.5'
  },

  // suggest to replace plugin with bridge
  deprecatePlugin: false,

  // version of storage this wallet is compatible with
  storageVersion: '1.1.0',

  // fee per kb for new txs
  feePerKb: 10000,

  // default coin name for new accounts
  coin: 'Bitcoin',

  // coin name -> backend config
  backends: {
    Bitcoin: {
      endpoint: 'https://mytrezor.com',
      after: '2014-01-01',
      lookAhead: 40,
      firstIndex: 0
    },
    Testnet: {
      endpoint: 'https://test.mytrezor.com',
      after: '2014-01-01',
      lookAhead: 40,
      firstIndex: 0
    }
  },

  // coin name -> public address version
  versions: {
    Bitcoin: 76067358,
    Testnet: 76067358, // 70617039
  },

  // coin name -> address type -> script type
  scriptTypes: {
    Bitcoin: {
      5: 'PAYTOSCRIPTHASH'
    }
  },

  // coin name -> bip32 tree index
  indices: {
    Bitcoin: 0,
    Testnet: 1
  },

  // coin name -> block explorer
  // Transaction hash will be appended to the block explorer URL.
  blockExplorers: {
    Bitcoin: {
      urlTx: 'https://blockchain.info/tx/',
      urlAddress: 'https://blockchain.info/address/',
      name: 'Blockchain'
    },
    // Bitcoin: {
    //   urlTx: 'http://live.insight.is/tx/',
    //   urlAddress: 'http://live.insight.is/address/',
    //   name: 'Insight'
    // },
    // Bitcoin: {
    //   urlTx: 'https://blockr.io/tx/info/',
    //   urlAddress: 'https://blockr.io/address/info/',
    //   name: 'Blockr'
    // },
    // Testnet: {
    //   url: 'http://test-insight.bitpay.com/tx/',
    //   urlAddress: 'http://test-insight.bitpay.com/address/',
    //   name: 'Insight'
    // }
    Testnet: {
      urlTx: 'https://tbtc.blockr.io/tx/info/',
      urlAddress: 'https://tbtc.blockr.io/address/info/',
      name: 'Blockr'
    }
  },

  useBip44: true

});
