export default class Kircher {
  static repair (code, n) {
    let finalCode = ''
    const chunckSize = parseInt(code.length / n)
    const chuncks = []

    while (code.length > 0) {
      chuncks.push(code.splice(0, chunckSize))
    }
    for (let i = 0; i < chunckSize; i++) {
      let countOne = 0
      let countZero = 0
      chuncks.forEach(function (chunck) {
        if (chunck[i].value === '1') {
          countOne += chunck[i].probability
        } else if (chunck[i].value === '0') {
          countZero += chunck[i].probability
        }
      })
      let code = (countOne > countZero) ? '1' : '0'
      finalCode += code
    }
    return finalCode
  }

  static decode (image, nRepair) {
    let rgbaPlanes = new cv.MatVector()
    cv.split(image, rgbaPlanes)
    let grayImage = rgbaPlanes.get(2)

    const height = grayImage.rows
    const width = grayImage.cols
    const qrCodeSize = 60

    console.log(width + 'x' + height)
    if (height !== width) {
      alert('grayImage is not a square! [' + width + 'x' + height + ']')
      return null
    }

    const squareSize = parseInt(width / qrCodeSize)
    console.log('squareSize: ' + squareSize)
    const repeatEncoding = 1

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

        let avg = cv.mean(centroid)[0]

        let squareBit = new cv.Mat(squareSize, squareSize, cv.CV_8UC4)
        cv.threshold(square, squareBit, avg, 255, cv.THRESH_BINARY_INV)

        // square_bit = cv.subtract(square_bit, focus_bw) TODO: implement this!
        let contours = new cv.MatVector()
        let hierarchy = new cv.Mat()
        cv.findContours(squareBit, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE)
        let contour = this.__filterContours(contours)

        let code = {
          value: '0',
          probability: 0
        }
        if (contour) {
          let line = new cv.Mat()
          cv.fitLine(contour, line, cv.DIST_L2, 0, 0.01, 0.01) // [vx,vy,x,y]
          let vx = Math.abs(line.data32F[0])
          let vy = Math.abs(line.data32F[1])

          code = {
            value: (vx > vy) ? '1' : '0',
            probability: Math.max(vx, vy)
          }
          line.delete()
        }
        fullCode.push(code)

        hierarchy.delete()
        contours.delete()
        squareBit.delete()
        square.delete()

        let n = row * qrCodeSize + col
        if (!(encoding[n] === code.value)) {
          // console.log('wrong!!' + n)
          countError++
        }
      }
    }
    fullCode = this.repair(fullCode, nRepair)
    console.log('number of errors: ' + countError + '/3600')
    return this.__decodeBinaryString(fullCode)
  }

  static __filterContours (contours) {
    if (contours.size() === 0) {
      return null
    }
    if (contours.size() === 1) {
      return contours.get(0)
    }
    let maxArea = 0
    let maxContour = null
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i)
      let area = cv.contourArea(cnt)
      if (area > maxArea) {
        maxArea = area
        maxContour = cnt
      }
    }
    return maxContour
  }

  static __decodeBinaryString (s) {
    if (!s || !s.length) {
      alert('no code!')
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
