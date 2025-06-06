const path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "./src/index.jsx"), // ✅ Ensures Webpack finds the file
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      { test: /\.(js|jsx)$/, exclude: /node_modules/, use: "babel-loader" },
      { test: /\.css$/i, use: ["style-loader", "css-loader"] },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"], // ✅ Allows Webpack to find JSX files
  },
};