# cropper.js

cropper.js is an image uploading and cropping tool that can easily be added to your website.
The current version supports cropping and automatic resizing to a given value, as well as exporting the result.
The aspect ratio of the crop is fixed and files with a side longer than `options.limit` are resized on upload.

![Example of cropper.js being used](https://i.imgur.com/mzbeAgY.png)

This project is open source and still under development, so any additions or changes are welcome.
Just submit a pull request and I will take a look at your contribution!

The library is written in ECMAScript 6, so make sure that target browsers support it, or use [Babel](https://babeljs.io/) for backwards-compatibility.

## Documentation

The [documentation](http://billy-brown.net/cropper.js/docs) has examples on how to use the `Uploader` and `Cropper` classes provided, as well as a description of the few functions they need.
An example webpage can be seen here: [https://www.billy-brown.net/cropper.js/](https://www.billy-brown.net/cropper.js/)

## Examples

You can experiment with the code over on Codepen here: [https://codepen.io/_Billy_Brown/pen/zvzWym?editors=101](http://codepen.io/_Billy_Brown/pen/zvzWym?editors=101)

The `example.html` page contains a basic image cropper.

## License

This project is licensed under The MIT License (MIT).

See accompanying LICENSE file.
