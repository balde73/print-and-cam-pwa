# print-and-cam-pwa

> Progressive web app decoding hidden information in HQR images

## Build Setup

``` bash
# install dependencies
yarn

# serve with hot reload at localhost:8080
yarn dev

# build for production with minification
yarn build

# build for production and view the bundle analyzer report
yarn build --report
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Known issues

- [ ] The app does not truely work offline due to a problem with OpenCV
- [ ] The marker identification is extremely simple leading to false-positives
- [ ] The decoding is time consuming (try using TensorFlow.js)
- [ ] OpenCV is consuming a lot of memory and iOS devices can crash after some time
- [ ] When an image is uploaded using the 'chose file' input, camera-orientation is not handled
