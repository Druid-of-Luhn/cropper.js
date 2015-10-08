# cropper.js

cropper.js is an image uploading and cropping tool that can easily be added to your website.
The current version supports cropping and automatic resizing to a given value, as well as exporting the result.
The aspect ratio of the crop is fixed and files with a side longer than 600px are resized on upload.

This project is open source and still under development, so any additions or changes are welcome.
Just submit a pull request and I will take a look at your contribution!

## Tutorial

The [documentation](http://billy-brown.net/cropper.js/docs) has examples on how to use the `Uploader` and `Cropper` classes provided, as well as a description of the few functions they need.

Below is a minimal example of using cropper.js:

```
<input type="file" class="js-fileinput img-upload" accept="image/jpeg,image/png,image/gif">
<button class="js-export">Export</button>
<canvas class="js-editorcanvas hidden"></canvas>
<canvas class="js-previewcanvas"></canvas>
```

With the accompanying JavaScript:

```
(function main() {
  // Auto-resize the cropped image
  var dimensions = { width: 128, height: 128 };

  var uploader = new Uploader({
    exceptions: alert,
    input: ".js-fileinput",
    types: ["gif", "jpg", "jpeg", "png"]
  });

  var editor = new Cropper({
    exceptions: alert,
    size: dimensions,
    canvas: ".js-editorcanvas",
    preview: ".js-previewcanvas"
  });

  // Make sure both were initialised correctly
  if (uploader !== null && editor != null) {
    // Start the uploader, which will launch the editor
    uploader.listen(editor.setImageSource.bind(editor));
  }
  // Allow the result to be exported as an actual image
  var img = document.createElement("img");
  document.body.appendChild(img);
  document.querySelector(".js-export")
    .addEventListener("click", function (e) {
      editor.export(img);
    });
})();
```

## License

This project is licensed under The MIT License (MIT).

See accompanying LICENSE file.
