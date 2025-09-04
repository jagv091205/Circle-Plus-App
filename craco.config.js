module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          "fs": false,
          "stream": require.resolve("stream-browserify"),
          "zlib": require.resolve("browserify-zlib")
        }
      }
    }
  }
};
