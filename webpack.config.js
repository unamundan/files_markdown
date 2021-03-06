const path = require('path');
const ExtractTextPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => ({
	optimization: {
		splitChunks: {
			cacheGroups: {
				styles: {
					name: 'styles',
					test: /\.css$/,
					chunks: 'all',
					enforce: true,
				},
			},
		},
	},
	devtool: 'source-map',
	entry: "./js/editor.ts",
	output: {
		filename: "editor.js",
		path: path.resolve(__dirname, "build")
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: "[name].css",
		}),
	],
	module: {
		rules: [
			{
				test: /\.ts/,
				loader: "ts-loader"
			},
			{
				test: /\.js$/,
				include: [
					path.resolve(__dirname, "js"),
					path.resolve(__dirname, "node_modules/markdown-it-anchor"),
					path.resolve(__dirname, "node_modules/markdown-it-texmath"),
					path.resolve(__dirname, "node_modules/markdown-it-highlightjs"),
					path.resolve(__dirname, "node_modules/markdown-it-github-preamble")
				],
				use: {
					loader: 'babel-loader'
				}
			},
			{
				test: /\.css$/,
				use: [
					argv.mode !== 'production'
						? 'style-loader'
						: ExtractTextPlugin.loader,
					'css-loader'
				]
			},
			{
				test: /\.(png|jpg|gif|svg|woff|woff2|ttf|eot)$/,
				use: [
					{
						loader: 'file-loader',
						options: {}
					}
				]
			}
		]
	}
});
