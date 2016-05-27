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
        }

        let file = this.fileInput.files[0];
        // Make sure the file is of the correct type
        if (!this.validFileType(file.type)) {
          reject(`[Uploader:listen] Invalid file type: ${file.type}`);
        } else {
          // Read the image as base64 data
          this.reader.readAsDataURL(file);
          // When loaded, return the file data
          this.reader.onload = (e) => resolve(e.target.result);
        }
      };
    });
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
      pos: { x: 0, y: 0 }
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
  render() {
    this.c.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    this.displayImage();
    this.preview();
    this.drawCropWindow();
  }

  /** @private */
  readyEditor(e) {
    // Listen for clicks in the canvas
    this.imageCanvas.onmousedown = this.clickStart.bind(this);
    this.boundDrag = this.drag.bind(this);
    this.boundClickStop = this.clickStop.bind(this);
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
    const position = {
      x: e.offsetX,
      y: e.offsetY
    };
    const dx = position.x - this.lastEvent.position.x;
    const dy = position.y - this.lastEvent.position.y;
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
    let handle = {
      x: this.crop.pos.x + this.crop.size.width,
      y: this.crop.pos.y + this.crop.size.height
    };
    // Maintain the aspect ratio
    const amount = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (this.inBounds(handle.x + amount, handle.y + amount)) {
      this.crop.size.width += amount;
      this.crop.size.height += amount;
    }
  }

  /** @private */
  move(dx, dy) {
    // Get the opposing coordinates
    const tl = {
      x: this.crop.pos.x,
      y: this.crop.pos.y
    };
    const br = {
      x: this.crop.pos.x + this.crop.size.width,
      y: this.crop.pos.y + this.crop.size.height
    };
    // Make sure they are in bounds
    if (this.inBounds(tl.x + dx, tl.y + dy) &&
        this.inBounds(br.x + dx, tl.y + dy) &&
        this.inBounds(br.x + dx, br.y + dy) &&
        this.inBounds(tl.x + dx, br.y + dy)) {
      this.crop.pos.x += dx;
      this.crop.pos.y += dy;
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
    const pos = this.crop.pos;
    const size = this.crop.size;
    this.c.strokeStyle = 'red';
    this.c.fillStyle = 'red';
    // Draw the crop window outline
    this.c.strokeRect(pos.x, pos.y, size.width, size.height);
    // Draw the draggable handle
    var path = new Path2D();
    path.arc(pos.x + size.width, pos.y + size.height, 3, 0, Math.PI * 2, true);
    this.c.fill(path);
  }

  /** @private */
  preview() {
    const pos = this.crop.pos;
    const size = this.crop.size;
    var imageData = this.c.getImageData(pos.x, pos.y, size.width, size.height);
    if (imageData === null) {
      return false;
    }
    var ctx = this.previewCanvas.getContext('2d');
    this.previewCanvas.width = size.width;
    this.previewCanvas.height = size.height;
    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    // Draw the image to the preview canvas, resizing it to fit
    ctx.drawImage(this.imageCanvas,
        // Top left corner coordinates of image
        pos.x, pos.y,
        // Width and height of image
        size.width, size.height,
        // Top left corner coordinates of result in canvas
        0, 0,
        // Width and height of result in canvas
        this.previewCanvas.width, this.previewCanvas.height);
  }

  /** @private */
  isResizing(coord) {
    var errorOffset = 10;
    var handle = {
      x: this.crop.pos.x + this.crop.size.width,
      y: this.crop.pos.y + this.crop.size.height
    };
    return !(coord.x < handle.x - errorOffset || coord.x > handle.x + errorOffset
          || coord.y < handle.y - errorOffset || coord.y > handle.y + errorOffset);
  }

  /** @private */
  isMoving(coord) {
    const pos = this.crop.pos;
    const size = this.crop.size;
    return !(coord.x < pos.x || coord.x > pos.x + size.width
          || coord.y < pos.y || coord.y > pos.y + size.height);
  }

  /** @private */
  inBounds(x, y) {
    return x >= 0 && x <= this.imageCanvas.width &&
           y >= 0 && y <= this.imageCanvas.height;
  }
}
