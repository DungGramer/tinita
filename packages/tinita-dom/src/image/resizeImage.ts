export const resizeImage = (datas, x, y, scale) => {
  return new Promise((resolve) => {
    // We create an image to receive the Data URI
    const img = document.createElement('img');

    // When the event "onload" is triggered we can resize the image.
    img.onload = function () {
      const inputWidth = img.naturalWidth;
      const inputHeight = img.naturalHeight;
      const wantedWidth = inputWidth / scale;
      const wantedHeight = inputHeight / scale;
      // We create a canvas and get its context.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // We set the dimensions at the wanted size.
      canvas.width = wantedWidth;
      canvas.height = wantedHeight;

      // We resize the image with the canvas method drawImage();
      ctx.drawImage(
        this,
        x,
        y,
        wantedWidth,
        wantedHeight,
        0,
        0,
        wantedWidth,
        wantedHeight
      );

      const dataURI = canvas.toDataURL();

      // This is the return of the Promise
      resolve(dataURI);
    };

    // We put the Data URI in the image's src attribute
    img.src = datas;
  });
};
