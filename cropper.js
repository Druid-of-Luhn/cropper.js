/**
 * @file Allows uploading, cropping (with automatic resizing) and exporting
 * of images.
 * @author Billy Brown
 * @license MIT
 * @version 2.0.0
 */

/** Class used for uploading images. */
class Uploader {
/**
 * <p>Creates an Uploader instance with parameters passed as an object.</p>
 * <p>Available parameters are:</p>
 * <ul>
 *  <li>exceptions {function}: the exceptions handler to use, function that takes a string.</li>
 *  <li>input {HTMLElement} (required): the file input element. Instantiation fails if not provided.</li>
 *  <li>types {array}: the file types accepted by the uploader.</li>
 * </ul>
 *
 * @example
 * var uploader = new Uploader({
 *  input: document.querySelector('.js-fileinput'),
 *  types: [ 'gif', 'jpg', 'jpeg', 'png' ]
 * });
 * *
 * @param {object} options the parameters to be passed for instantiation
 */
  constructor(options) {
    if (!options.input) {
      throw '[Uploader] Missing input file element.';
    }
    this.fileInput = options.input;
    this.types = options.types || [ 'gif', 'jpg', 'jpeg', 'png' ];
    this.reader = new FileReader();
  }

  /**
   * Listen for an image file to be uploaded, then validate it and resolve with the image data.
   * @return {Promise} Resolves to the image data.
   */
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

  /** @private */
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

  /** @private */
  validFileType(filename) {
    // Get the second part of the MIME type
    let extension = filename.split('/').pop().toLowerCase();
    // See if it is in the array of allowed types
    return this.types.includes(extension);
  }
}

/** Class for cropping an image. */
class Cropper {
  /**
   * <p>Creates a Cropper instance with parameters passed as an object.</p>
   * <p>Available parameters are:</p>
   * <ul>
   *  <li>size {object} (required): the dimensions of the cropped, resized image. Must have 'width' and 'height' fields. </li>
   *  <li>limit {integer}: the longest side that the cropping area will be limited to, resizing any larger images.</li>
   *  <li>canvas {HTMLElement} (required): the cropping canvas element. Instantiation fails if not provided.</li>
   *  <li>preview {HTMLElement} (required): the preview canvas element. Instantiation fails if not provided.</li>
   * </ul>
   *
   * @example
   * var editor = new Cropper({
   *  size: { width: 128, height: 128 },
   *  limit: 600,
   *  canvas: document.querySelector('.js-editorcanvas'),
   *  preview: document.querySelector('.js-previewcanvas')
   * });
   *
   * @param {object} options the parameters to be passed for instantiation
   */
  constructor(options) {
    // Check the inputs
    if (!options.size) {
      throw 'Size field in options is required';
    }
    if (!options.canvas) {
      throw 'Could not find image canvas element.';
    }
    if (!options.preview) {
      throw 'Could not find preview canvas element.';
    }
    // Hold on to the values
    this.imageCanvas = options.canvas;
    this.previewCanvas = options.preview;
    this.c = this.imageCanvas.getContext("2d");
    // Create the cropping square
    this.crop = {
      size: options.size,
      tl: { x: 0, y: 0 },
      br: { x: options.size.width, y: options.size.height }
    };
    this.lastEvent = null;
    // Images larger than options.limit are resized
    this.limit = options.limit || 600; // default to 600px
  }

  /**
   * Set the source image data for the cropper.
   *
   * @param {String} source the source of the image to crop.
   */
  setImageSource(source) {
    this.image = new Image();
    this.image.src = source;
    this.image.onload = this.readyEditor.bind(this);
    // Perform an initial render
    this.render();
  }

  /**
   * Export the result to a given image tag.
   *
   * @param {HTMLElement} img the image tag to export the result to.
   */
  export(img) {
    img.setAttribute('src', this.previewCanvas.toDataURL());
  }

  /** @private */
  readyEditor(e) {
    this.imageCanvas.classList.remove('hidden');
    this.render();
    // Listen for clicks in the canvas
    this.imageCanvas.onmousedown = this.clickStart.bind(this);
    this.boundDrag = this.drag.bind(this);
    this.boundClickStop = this.clickStop.bind(this);
  }

  /** @private */
  render() {
    this.c.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    this.displayImage();
    this.preview();
    this.drawCropWindow();
  }

  /** @private */
  clickStart(e) {
  // Get the crop handle to use
  var position = { x: e.offsetX, y: e.offsetY };
  this.lastEvent = {
    position: position,
    resizing: this.isResizing(position),
    moving: this.isMoving(position)
  };
  // Listen for mouse movement and mouse release
  this.imageCanvas.addEventListener('mousemove', this.boundDrag);
  this.imageCanvas.addEventListener('mouseup', this.boundClickStop);
  }

  /** @private */
  clickStop(e) {
    this.imageCanvas.removeEventListener("mousemove", this.boundDrag);
    this.imageCanvas.removeEventListener("mouseup", this.boundClickStop);
  }

  /** @private */
  drag(e) {
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
  }

  /** @private */
  resize(dx, dy) {
    var handle = this.crop.br;
    // Maintain the aspect ratio
    var amount = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (this.inBounds(handle.x + amount, handle.y + amount)) {
      handle.x += amount;
      handle.y += amount;
    }
  }

  /** @private */
  move(dx, dy) {
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
  }

  /** @private */
  displayImage() {
    // Resize the original to the maximum allowed size
    if (this.image.width > this.limit) {
      this.image.height *= this.limit / this.image.width;
      this.image.width = this.limit;
    } else if (this.image.height > this.limit) {
      this.image.width *= this.limit / this.image.height;
      this.image.height = this.limit;
    }
    // Fit the image to the canvas (fixed width canvas, dynamic height)
    this.imageCanvas.width = this.image.width;
    this.imageCanvas.height = this.image.height;
    this.c.drawImage(this.image, 0, 0, this.image.width, this.image.height);
  }

  /** @private */
  drawCropWindow() {
    var tl = this.crop.tl;
    var br = this.crop.br;
    this.c.strokeStyle = 'red';
    this.c.fillStyle = 'red';
    // Draw the crop window outline
    this.c.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // Draw the draggable handle
    var path = new Path2D();
    path.arc(br.x, br.y, 3, 0, Math.PI * 2, true);
    this.c.fill(path);
  }

  /** @private */
  preview() {
    var tl = this.crop.tl;
    var br = this.crop.br;
    var imageData = this.c.getImageData(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    if (imageData === null) {
      return false;
    }
    var ctx = this.previewCanvas.getContext('2d');
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
  }

  /** @private */
  isResizing(pos) {
    var errorOffset = 10;
    var handle = this.crop.br;
    return !(pos.x < handle.x - errorOffset || pos.x > handle.x + errorOffset ||
        pos.y < handle.y - errorOffset || pos.y > handle.y + errorOffset);
  }

  /** @private */
  isMoving(pos) {
    var tl = this.crop.tl;
    var br = this.crop.br;
    return !(pos.x < tl.x || pos.x > br.x || pos.y < tl.y || pos.y > br.y);
  }

  /** @private */
  inBounds(x, y) {
    return x >= 0 && x <= this.imageCanvas.width &&
           y >= 0 && y <= this.imageCanvas.height;
  }
}
