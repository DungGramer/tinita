/**
 * PostCSS Configuration for tinita-react
 *
 * Used by PostCSS CLI to process CSS files during build.
 */

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    cssnano:
      process.env.NODE_ENV === 'production'
        ? {
            preset: 'default',
            discardComments: { removeAll: true },
          }
        : false,
  },
};
