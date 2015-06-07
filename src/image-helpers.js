const fs = require('fs');
const lwip = require('lwip');
const imgur = require('imgur');
const promisify = require('promisify-node');

const openImage = promisify(lwip.open);
const createImage = promisify(lwip.create);

class ImageHelpers {

  // Public: Creates an image of the board from the given cards using the
  // light-weight image processing library (`lwip`), then writes the result to
  // a file and uploads it to `imgur`.
  //
  // imageFiles - An array of three image files
  // outputFile - The file where the result will be saved
  //
  // Returns an {Observable} that will `onNext` with the URL of the combined
  // image, or `onError` if anything goes wrong
  static createBoardImage(cards) {
    let imageFiles = cards.map((c) => `resources/${c}.jpeg`);

    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }

    switch (cards.length) {
    case 3:
      return ImageHelpers.combineThree(imageFiles, './output/flop.jpeg');
    case 4:
      return ImageHelpers.combineTwo(['./output/flop.jpeg', imageFiles[3]], './output/turn.jpeg');
    case 5:
      return ImageHelpers.combineThree(['./output/flop.jpeg', imageFiles[3], imageFiles[4]], './output/river.jpeg');
    }
  }

  // Private: Combines two image files into a single row
  //
  // imageFiles - An array of two image files
  // outputFile - The file where the result will be saved
  //
  // Returns a {Promise} of the resulting file
  static combineTwo(imageFiles, outputFile) {
    let images = [];

    return openImage(imageFiles[0])
      .then((firstImage) => {
        images.push(firstImage);
        return openImage(imageFiles[1]);
      })
      .then((secondImage) => {
        images.push(secondImage);
        return createImage(images[0].width() + images[1].width(), images[0].height(), 'white');
      })
      .then((destImage) => ImageHelpers.paste(images[0], destImage, 0, 0))
      .then((destImage) => ImageHelpers.paste(images[1], destImage, images[0].width(), 0))
      .then((destImage) => ImageHelpers.writeFile(destImage, outputFile));
  }

  // Private: Combines three images files into a single row, using the
  // `combineTwo` sequentially
  //
  // imageFiles - An array of three image files
  // outputFile - The file where the result will be saved
  //
  // Returns a {Promise} of the resulting file
  static combineThree(imageFiles, outputFile) {
    return ImageHelpers.combineTwo(imageFiles.slice(0, 2), outputFile)
      .then(() => ImageHelpers.combineTwo([outputFile, imageFiles[2]], outputFile));
  }

  // Private: Returns a Promisified version of the `paste` method
  //
  // src - The image to paste
  // dest - The target image for the paste operation
  // x - The x-coordinate of the paste
  // y - The y-coordinate of the paste
  //
  // Returns a {Promise} of the resulting image
  static paste(src, dest, x, y) {
    return new Promise((resolve, reject) => {
      dest.paste(x, y, src, (err, img) => {
        if (!err) {
          resolve(img);
        } else {
          reject(err);
        }
      });
    });
  }

  // Private: Returns a Promisified version of the `writeFile` method
  //
  // img - The image to write
  // outputFile - The output file path
  //
  // Returns a {Promise} indicating completion
  static writeFile(img, outputFile) {
    return new Promise((resolve, reject) => {
      img.writeFile(outputFile, (err) => {
        if (!err) {
          resolve(outputFile);
        } else {
          reject(err);
        }
      });
    });
  }

  // Private: Returns a Promisified version of the `toBuffer` method
  //
  // img - The image to convert
  //
  // Returns a {Promise} of the {Buffer}, encoded as a jpeg
  static toBuffer(img) {
    return new Promise((resolve, reject) => {
      img.toBuffer('jpg', {quality: 100}, (err, buffer) => {
        if (!err) {
          resolve(buffer);
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = ImageHelpers;