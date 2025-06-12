module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: [
            'Chrome >= 58',
            'Firefox >= 57',
            'Safari >= 11',
            'Edge >= 16',
            'iOS >= 10',
            'Android >= 5',
            '> 1%',
            'not dead',
            'not ie <= 11'
          ]
        },
        useBuiltIns: 'entry',
        corejs: 3,
        modules: false,
        debug: false
      }
    ],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    '@babel/plugin-transform-runtime'
  ],
  env: {
    development: {
      plugins: ['react-refresh/babel']
    }
  }
}; 