
You are invited to fork this repository and contribute own enhancements, and I gladly accept pull requests.

However, to get coding, you need to utilize a ES6 compiler to make the code runnable in a browser. The ES6 compiler transforms the files into "old" Javascript code and should place it in the dist folder. I use https://babeljs.io/ for that, you get it automatically, if you run npm install. WebStorm, my favourite IDE, has a file watcher, which calls babel every time I make changes to one of the .js files, so it is very convenient and I recommend that very much.

I recently added a node.js / express.js example application (can be found in the example folder), so if you have node.js installed, you may just run npm i to install dependencies and then npm start. The browser should start automatically and show the example network. If you make changes to the code, it should automatically refresh due to the watch option of the utilized forever (just have a look into package.json to see how I did it).

It would be great if the mechanism to generate browser compatible code from ES6 would be independent of WebStorm, so if you have spare time... ;-)
