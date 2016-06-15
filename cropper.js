/**
 * @file Allows uploading, cropping (with automatic resizing) and exporting
 * of images.
 * @author Billy Brown
 * @license MIT
 * @version 2.0.1
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

function squareContains(square, coordinate) {
  return coordinate.x >= square.pos.x
    && coordinate.x <= square.pos.x + square.size.x
    && coordinate.y >= square.pos.y
    && coordinate.y <= square.pos.y + square.size.y;
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
    if (!options.size) { throw 'Size field in options is required'; }
    if (!options.canvas) { throw 'Could not find image canvas element.'; }
    if (!options.preview) { throw 'Could not find preview canvas element.'; }

    // Hold on to the values
    this.imageCanvas = options.canvas;
    this.previewCanvas = options.preview;
    this.c = this.imageCanvas.getContext("2d");
    
    // Images larger than options.limit are resized
    this.limit = options.limit || 600; // default to 600px
    // Create the cropping square with the handle's size
    this.crop = {
      size: { x: options.size.width, y: options.size.height },
      pos: { x: 0, y: 0 },
      handleSize: 10
    };
    this.lastEvent = null;
    // Bind the methods, ready to be added and removed as events
    this.boundDrag = this.drag.bind(this);
    this.boundClickStop = this.clickStop.bind(this);
  }

  /**
   * Set the source image data for the cropper.
   *
   * @param {String} source the source of the image to crop.
   */
  setImageSource(source) {
    this.image = new Image();
    this.image.src = source;
    this.image.onload = (e) => {
      // Perform an initial render
      this.render();
      // Listen for events on the canvas when the image is ready
      this.imageCanvas.onmousedown = this.clickStart.bind(this);
    }
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
  clickStart(e) {
    // Get the click position and hold onto it for the expected mousemove
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
    // Stop listening for mouse movement and mouse release
    this.imageCanvas.removeEventListener("mousemove", this.boundDrag);
    this.imageCanvas.removeEventListener("mouseup", this.boundClickStop);
  }

  /** @private */
  isResizing(coord) {
    const size = this.crop.handleSize;
    const handle = {
      pos: {
        x: this.crop.pos.x + this.crop.size.x - size / 2,
        y: this.crop.pos.y + this.crop.size.y - size / 2
      },
      size: { x: size, y: size }
    };
    return squareContains(handle, coord);
  }

  /** @private */
  isMoving(coord) {
    return squareContains(this.crop, coord);
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
      x: this.crop.pos.x + this.crop.size.x,
      y: this.crop.pos.y + this.crop.size.y
    };
    // Maintain the aspect ratio
    const amount = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (this.inBounds(handle.x + amount, handle.y + amount)) {
      this.crop.size.x += amount;
      this.crop.size.y += amount;
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
      x: this.crop.pos.x + this.crop.size.x,
      y: this.crop.pos.y + this.crop.size.y
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
    }
    if (this.image.height > this.limit) {
      this.image.width *= this.limit / this.image.height;
      this.image.height = this.limit;
    }
    // Fit the image to the canvas
    this.imageCanvas.width = this.image.width;
    this.imageCanvas.height = this.image.height;
    this.c.drawImage(this.image, 0, 0, this.image.width, this.image.height);
  }

  /** @private */
  drawCropWindow() {
    const pos = this.crop.pos;
    const size = this.crop.size;
    const radius = this.crop.handleSize / 2;
    this.c.strokeStyle = 'red';
    this.c.fillStyle = 'red';
    // Draw the crop window outline
    this.c.strokeRect(pos.x, pos.y, size.x, size.y);
    // Draw the draggable handle
    var path = new Path2D();
    path.arc(pos.x + size.x, pos.y + size.y, radius, 0, Math.PI * 2, true);
    this.c.fill(path);
  }

  /** @private */
  preview() {
    const pos = this.crop.pos;
    const size = this.crop.size;
    // Fetch the image data from the canvas
    var imageData = this.c.getImageData(pos.x, pos.y, size.x, size.y);
    if (imageData === null) {
      return false;
    }
    // Prepare and clear the preview canvas
    var ctx = this.previewCanvas.getContext('2d');
    this.previewCanvas.width = size.x;
    this.previewCanvas.height = size.y;
    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    // Draw the image to the preview canvas, resizing it to fit
    ctx.drawImage(this.imageCanvas,
        // Top left corner coordinates of image
        pos.x, pos.y,
        // Width and height of image
        size.x, size.y,
        // Top left corner coordinates of result in canvas
        0, 0,
        // Width and height of result in canvas
        this.previewCanvas.width, this.previewCanvas.height);
  }

  /** @private */
  inBounds(x, y) {
    return squareContains({
      pos: { x: 0, y: 0 },
      size: {
        x: this.imageCanvas.width,
        y: this.imageCanvas.height
      }
    }, { x: x, y: y });
  }
}
