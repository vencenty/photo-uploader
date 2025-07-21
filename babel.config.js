export default {
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
        useBuiltIns: 'usage', // 按需引入polyfills，减少包体积
        corejs: 3,
        modules: false,
        debug: false,
        // 添加更多兼容性选项
        shippedProposals: true,
        bugfixes: true
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
} 