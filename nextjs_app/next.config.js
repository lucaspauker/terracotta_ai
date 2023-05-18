module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: true,
      },
    ]
  },
}
