class Uploader {
  constructor(options) {
    if (!options.input) {
      throw '[Uploader] Missing input file element.';
    }
    this.fileInput = options.input;
    this.types = options.types || [ 'gif', 'jpg', 'jpeg', 'png' ];
    this.reader = new FileReader();
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.fileInput.onchange = (e) => {
        // Do not submit the form
        e.preventDefault();
        // Make sure one file was selected
        if (!this.fileInput.files || this.fileInput.files.length !== 1) {
          reject('[Uploader:listen] Select only one file.');
        } else {
          this.fileReaderSetup(this.fileInput.files[0], resolve, reject);
        }
      };
    });
  }

  fileReaderSetup(file, resolve) {
    if (this.validFileType(file.type)) {
      // Read the image as base64 data
      this.reader.readAsDataURL(file);
      // Resolve the promise with the image data
      this.reader.onload = (e) => resolve(e.target.result);
    } else {
      reject('[Uploader:fileReaderSetup] Invalid file type.');
    }
  }

  validFileType(filename) {
    // Get the second part of the MIME type
    let extension = filename.split('/').pop().toLowerCase();
    // See if it is in the array of allowed types
    return this.allowedTypes.includes(extension);
  }
}
/**
 * @file Allows uploading, cropping (with automatic resizing) and exporting
 * of images.
 * @author Billy Brown
 * @license MIT
 * @version 1.0.0
 */

/**
 * <p>Creates an Uploader instance with parameters passed as an object.</p>
 * <p>Available parameters are:</p>
 * <ul>
 *  <li>exceptions {function}: the exceptions handler to use, function that takes a string.</li>
 *  <li>input {string} (required): the classname (prefixed with ".") for the input element. Instantiation fails if not provided.</li>
 *  <li>types {array}: the file types accepted by the uploader.</li>
 * </ul>
 *
 * @example
 * var uploader = new Uploader({
 *  exceptions: alert,
 *  input: ".js-fileinput",
 *  types: ["gif", "jpg", "jpeg", "png"]
 * });
 *
 * @class
 * @param {object} options - the parameters to be passed for instantiation
 */
// function Uploader(options) {
//   /** @private */
//   this.exceptionHandler = options.exceptions || console.log.bind(console);
//   this.fileInput = document.querySelector(options.input);
//   if (this.fileInput === null) {
//     this.exceptionHandler("Could not find file input element: " + options.input);
//     return null;
//   }
//   this.allowedTypes = options.types || ["gif", "jpg", "jpeg", "png"];
//   this.reader = new FileReader();
// }

// /**
//  * Calls a callback function when the file has been uploaded, passing it the
//  * image data in base64 format.
//  * @param {function} callback - the function to be called with the data when ready
//  */
// Uploader.prototype.listen = function (callback) {
//   if (!this.fileInput) {
//     return;
//   }
//   this.fileInput.addEventListener("change", function(e) {
//     // Do not submit the form
//     e.preventDefault();
//     // Make sure one file was selected
//     if (!this.fileInput.files || this.fileInput.files.length !== 1) {
//       this.exceptionHandler("Please select one file");
//     } else {
//       this.fileReaderSetup(this.fileInput.files[0], callback);
//     }
//   }.bind(this));
// };

// /** @private */
// Uploader.prototype.fileReaderSetup = function(file, callback) {
//   // Make sure the file is an image
//   if (this.validFileType(file.type)) {
//     // Read the image as base64 data
//     this.reader.readAsDataURL(file);
//     this.reader.addEventListener("load", function(e) {
//       // Call the callback with the image's base64 data when it's available
//       callback(e.target.result);
//     });
//   } else {
//     this.exceptionHandler("Invalid file type, please use one of: " + this.allowedTypes);
//   }
// };

// /** @private */
// Uploader.prototype.validFileType = function(filename) {
//   // Get the second part of the MIME type
//   var extension = filename.split("/").pop().toLowerCase();
//   // See if it is in the array of allowed types
//   return this.allowedTypes.indexOf(extension) !== -1;
// };

/**
 * <p>Creates a Cropper instance with parameters passed as an object.</p>
 * <p>Available parameters are:</p>
 * <ul>
 *  <li>exceptions {function}: the exceptions handler to use, function that takes a string.</li>
 *  <li>size {object} (required): the dimensions of the cropped, resized image. Must have 'width' and 'height' fields. </li>
 *  <li>canvas {string} (required): the classname (prefixed with ".") for the cropping canvas element. Instantiation fails if not provided.</li>
 *  <li>preview {string} (required): the classname (prefixed with ".") for the preview canvas element. Instantiation fails if not provided.</li>
 * </ul>
 *
 * @example
 * var editor = new Cropper({
 *  exceptions: alert,
 *  size: { width: 128, height: 128 },
 *  canvas: ".js-editorcanvas",
 *  preview: ".js-previewcanvas"
 * });
 *
 * @class
 * @param {object} options - the parameters to be passed for instantiation
 */
function Cropper(options) {
  /** @private */
  this.exceptionHandler = options.exceptions || console.log.bind(console);
  if (!options.size) {
    this.exceptionHandler("Size field in options is required");
    return null;
  }
  this.imageCanvas = document.querySelector(options.canvas);
  if (this.imageCanvas === null) {
    this.exceptionHandler("Coud not find canvas element: " + options.canvas);
    return null;
  }
  this.previewCanvas = document.querySelector(options.preview);
  if (this.previewCanvas === null) {
    this.exceptionHandler("Could not find canvas element: " + options.preview);
    return null;
  }
  this.c = this.imageCanvas.getContext("2d");
  this.crop = {
    size: options.size,
    tl: { x: 0, y: 0 },
    br: { x: options.size.width, y: options.size.height }
  };
  this.lastEvent = null;
}

/**
 * Sets the image object's source and starts up the cropping tool.
 *
 * @param {string} source - the image's source (can be base64 encoded)
 */
Cropper.prototype.setImageSource = function (source) {
  this.image = new Image();
  this.image.src = source;
  this.image.addEventListener("load", this.readyEditor.bind(this));
};

/**
 * Export the resulting cropped image to an image element.
 *
 * @param {object} img - an image object
 */
Cropper.prototype.export = function (img) {
  img.setAttribute("src", this.previewCanvas.toDataURL());
};

/** @private */
Cropper.prototype.readyEditor = function (e) {
  this.imageCanvas.classList.remove("hidden");
  this.render();
  // Listen for clicks in the canvas
  this.imageCanvas.addEventListener("mousedown", this.clickStart.bind(this));
  this.boundDrag = this.drag.bind(this);
  this.boundClickStop = this.clickStop.bind(this);
};

/** @private */
Cropper.prototype.render = function () {
  this.c.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
  this.displayImage();
  this.preview();
  this.drawCropWindow();
};

/** @private */
Cropper.prototype.clickStart = function (e) {
  // Get the crop handle to use
  var position = { x: e.offsetX, y: e.offsetY };
  this.lastEvent = {
    position: position,
    resizing: this.isResizing(position),
    moving: this.isMoving(position)
  };
  // Listen for mouse movement and mouse release
  this.imageCanvas.addEventListener("mousemove", this.boundDrag);
  this.imageCanvas.addEventListener("mouseup", this.boundClickStop);
};

/** @private */
Cropper.prototype.clickStop = function (e) {
  this.imageCanvas.removeEventListener("mousemove", this.boundDrag);
  this.imageCanvas.removeEventListener("mouseup", this.boundClickStop);
};

/** @private */
Cropper.prototype.drag = function (e) {
  var position = { x: e.offsetX, y: e.offsetY };
  var dx = position.x - this.lastEvent.position.x;
  var dy = position.y - this.lastEvent.position.y;
  // Determine whether we are resizing, moving, or nothing
  if (this.lastEvent.resizing) {
    this.resize(dx, dy);
  } else if (this.lastEvent.moving) {
    this.move(dx, dy);
  }
  // Update the last position
  this.lastEvent.position = position;
  this.render();
};

/** @private */
Cropper.prototype.resize = function (dx, dy) {
  var handle = this.crop.br;
  // Maintain the aspect ratio
  var amount = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  if (this.inBounds(handle.x + amount, handle.y + amount)) {
    handle.x += amount;
    handle.y += amount;
  }
};

/** @private */
Cropper.prototype.move = function (dx, dy) {
  var tl = this.crop.tl;
  var br = this.crop.br;
  // Make sure all four corners are in bounds
  if (this.inBounds(tl.x + dx, tl.y + dy) &&
      this.inBounds(br.x + dx, tl.y + dy) &&
      this.inBounds(br.x + dx, br.y + dy) &&
      this.inBounds(tl.x + dx, br.y + dy)) {
    tl.x += dx;
    tl.y += dy;
    br.x += dx;
    br.y += dy;
  }
};

/** @private */
Cropper.prototype.displayImage = function () {
  var maxSide = 600;
  // Resize the original to the maximum allowed size
  if (this.image.width > maxSide) {
    this.image.height *= maxSide / this.image.width;
    this.image.width = maxSide;
  } else if (this.image.height > maxSide) {
    this.image.width *= maxSide / this.image.height;
    this.image.height = maxSide;
  }
  // Fit the image to the canvas (fixed width canvas, dynamic height)
  this.imageCanvas.width = this.image.width;
  this.imageCanvas.height = this.image.height;
  this.c.drawImage(this.image, 0, 0, this.image.width, this.image.height);
};

/** @private */
Cropper.prototype.drawCropWindow = function () {
  var tl = this.crop.tl;
  var br = this.crop.br;
  this.c.strokeStyle = "red";
  this.c.fillStyle = "red";
  // Draw the crop window outline
  this.c.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  // Draw the draggable handle
  var path = new Path2D();
  path.arc(br.x, br.y, 3, 0, Math.PI * 2, true);
  this.c.fill(path);
};

/** @private */
Cropper.prototype.preview = function () {
  var tl = this.crop.tl;
  var br = this.crop.br;
  var imageData = this.c.getImageData(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  if (imageData === null) {
    return false;
  }
  var ctx = this.previewCanvas.getContext("2d");
  this.previewCanvas.width = this.crop.size.width;
  this.previewCanvas.height = this.crop.size.height;
  ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
  // Draw the image to the preview canvas, resizing it to fit
  ctx.drawImage(this.imageCanvas,
    // Top left corner coordinates of image
    tl.x, tl.y,
    // Width and height of image
    br.x - tl.x, br.y - tl.y,
    // Top left corner coordinates of result in canvas
    0, 0,
    // Width and height of result in canvas
    this.previewCanvas.width, this.previewCanvas.height);
};

/** @private */
Cropper.prototype.isResizing = function (pos) {
  var errorOffset = 10;
  var handle = this.crop.br;
  return !(pos.x < handle.x - errorOffset || pos.x > handle.x + errorOffset ||
    pos.y < handle.y - errorOffset || pos.y > handle.y + errorOffset);
};

/** @private */
Cropper.prototype.isMoving = function (pos) {
  var tl = this.crop.tl;
  var br = this.crop.br;
  return !(pos.x < tl.x || pos.x > br.x || pos.y < tl.y || pos.y > br.y);
};

/** @private */
Cropper.prototype.inBounds = function (x, y) {
  return x >= 0 && x <= this.imageCanvas.width &&
    y >= 0 && y <= this.imageCanvas.height;
};
