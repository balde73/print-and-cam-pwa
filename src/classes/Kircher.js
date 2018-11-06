export default class Kircher {
  static decode (image) {
    let rgbaPlanes = new cv.MatVector()
    cv.split(image, rgbaPlanes)
    let grayImage = rgbaPlanes.get(2)

    const height = grayImage.rows
    const width = grayImage.cols
    const qrCodeSize = 60

    console.log(width + 'x' + height)
    if (height !== width) {
      console.log('grayImage is not a square!')
      return null
    }

    const squareSize = parseInt(width / qrCodeSize)
    console.log('squareSize: ' + squareSize)
    const repeatEncoding = 1

    const maxArea = squareSize ** 2
    const minArea = parseInt(maxArea / 15)

    // just for testing!
    const maxSizeEncoded = parseInt(qrCodeSize * qrCodeSize / repeatEncoding)
    let st = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum nec dolor non consectetur. Nam vel euismod mauris. Aliquam sit amet ligula in est rutrum auctor ut ac lorem. Duis blandit convallis pulvinar. Pellentesque sed vestibulum purus. Curabitur lacinia luctus orci ac molestie. Morbi gravida hendrerit neque, non consequat dui eleifend id. Morbi tincidunt nisi enim, vel laoreet magna rutrum vel. Quisque vel ultrices lacus. Sed id diam eget justo rutrum rutrum. Nulla maximus augue ex, at viverra sem venenatis id. Morbi id orci vel enim luctus condimentum. Cras metus neque, ultricies ut condimentum in, euismod in est. Etiam maximus neque vel velit suscipit semper. Pellentesque nec velit odio'
    let startingEncoding = this.__encodeBinaryString(st)
    if (startingEncoding.length > maxSizeEncoded) {
      // cut the encoding
      startingEncoding = startingEncoding.substring(0, maxSizeEncoded)
    }
    let encoding = ''
    for (let i = 0; i < repeatEncoding; i++) {
      encoding += startingEncoding
    }
    let countError = 0
    // console.log('trying to read ' + encoding)

    let fullCode = []
    for (let row = 0; row < qrCodeSize; row++) {
      for (let col = 0; col < qrCodeSize; col++) {
        const fromY = parseInt(row * squareSize)
        const fromX = parseInt(col * squareSize)

        // console.log(fromX + ' ' + fromY + ':' + toX + ' ' + toY)
        let rectSquare = new cv.Rect(fromX, fromY, squareSize, squareSize)
        let square = grayImage.roi(rectSquare)

        let centerSquare = parseInt(squareSize / 2)
        let dimCenterSquare = parseInt(squareSize / 4)
        let initPosCentroid = centerSquare - dimCenterSquare
        // let endPosCentroid = centerSquare + dimCenterSquare
        let rectCentroid = new cv.Rect(initPosCentroid, initPosCentroid, dimCenterSquare * 2, dimCenterSquare * 2)
        let centroid = square.roi(rectCentroid)

        let avg = cv.mean(centroid)[0] // fix this. understand why 4 values instead of one

        let squareBit = new cv.Mat(squareSize, squareSize, cv.CV_8UC4)
        cv.threshold(square, squareBit, avg, 255, cv.THRESH_BINARY_INV)
        // square_bit = cv.subtract(square_bit, focus_bw) TODO: implement this!
        let contours = new cv.MatVector()
        let hierarchy = new cv.Mat()
        cv.findContours(squareBit, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE)

        let countVert = 0
        let countHor = 0

        for (let i = 0; i < contours.size(); i++) {
          let cnt = contours.get(i)
          let area = cv.contourArea(cnt)
          if (area > minArea) {
            let line = new cv.Mat()
            cv.fitLine(cnt, line, cv.DIST_L2, 0, 0.01, 0.01) // [vx,vy,x,y]
            let vx = line.data32F[0]
            let vy = line.data32F[1]
            // let x = line.data32F[2]
            // let y = line.data32F[3]

            /*
            let lefty = Math.round((-x * vy / vx) + y)
            let righty = Math.round(((square.cols - x) * vy / vx) + y)
            let point1 = new cv.Point(square.cols - 1, righty)
            let point2 = new cv.Point(0, lefty)

            let lineColor = new cv.Scalar(255, 0, 0)
            cv.line(square, point1, point2, lineColor, 2, cv.LINE_AA, 0)
            */
            if (Math.abs(vx) > Math.abs(vy)) {
              countHor += 1
            } else {
              countVert += 1
            }
          }
        }
        // cv.imshow(`bw-threshold-1`, square)
        let code = (countVert >= countHor) ? '0' : '1'
        // cv.imshow(`bw-threshold-1`, square)
        fullCode += code

        let n = row * qrCodeSize + col
        if (!(encoding[n] === code)) {
          // console.log('wrong!!' + n)
          countError++
        }
      }
    }
    console.log('number of errors: ' + countError + '/3600')
    return this.__decodeBinaryString(fullCode)
  }

  static __decodeBinaryString (s) {
    if (!s || !s.length) {
      return null
    }
    let countBytes = parseInt(s.length / 8)
    let code = ''
    for (let i = 0; i < countBytes; i++) {
      const byte = s.substring(i * 8, i * 8 + 8)
      code += String.fromCharCode(parseInt(byte, 2))
    }
    return code
  }

  static __encodeBinaryString (s) {
    let fullCode = ''
    for (let i = 0; i < s.length; i++) {
      const char = s[i]
      let code = char.charCodeAt(0).toString(2)
      while (code.length < 8) {
        code = '0' + code
      }
      fullCode += code
    }
    return fullCode
  }
}
