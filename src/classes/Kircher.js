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

  static qrRead (bitMatrix) {
    var parser = new BitMatrixParser(bitMatrix)
    var version = parser.readVersion()
    console.log('version: ' + version)

    var el = Decoder.decode(bitMatrix)
    var elByte = el.DataByte
    var elString = ''

    for (var i = 0; i < elByte.length; i++) {
      var currentWord = elByte[i]
      for (var j = 0; j < currentWord.length; j++) {
        let n = parseInt(currentWord[j])
        elString += String.fromCharCode(n)
      }
    }
    console.log(elString)
    return elString
  }

  static decode (image) {
    console.log('DECODING!')
    const startTime = new Date()

    let rgbaPlanes = new cv.MatVector()
    cv.split(image, rgbaPlanes)
    let grayImage = rgbaPlanes.get(2)

    const height = grayImage.rows
    const width = grayImage.cols
    const qrCodeSize = 29 // 4096 bit

    let bitImage = new cv.Mat.zeros(height, width, cv.CV_8UC1) // eslint-disable-line new-cap
    let errorImage = new cv.Mat()
    cv.cvtColor(grayImage, errorImage, cv.COLOR_GRAY2RGBA, 4)

    console.log(width + 'x' + height)
    if (height !== width) {
      alert('grayImage is not a square! [' + width + 'x' + height + ']')
      return null
    }

    const squareSize = parseInt(width / qrCodeSize)
    console.log('squareSize: ' + squareSize)

    cv.medianBlur(grayImage, grayImage, 3)

    let focus = new cv.Mat.zeros(squareSize, squareSize, cv.CV_8UC1) // eslint-disable-line new-cap
    const radius = parseInt(squareSize / 5)
    const center = parseInt(squareSize / 2)

    // const box = np.int0([(0, center-radius),(squareSize, center+radius),(squareSize, center+radius),(0, center-radius)])
    const colorWhite = new cv.Scalar(255, 255, 255)
    cv.ellipse(focus, new cv.Point(center, center), new cv.Size(center, radius), 90.0, 0.0, 360.0, colorWhite, -1)
    cv.ellipse(focus, new cv.Point(center, center), new cv.Size(center, radius), 0.0, 0.0, 360.0, colorWhite, -1)
    cv.threshold(focus, focus, 128, 255, cv.THRESH_BINARY_INV)

    var bitMatrix = new BitMatrix(qrCodeSize)
    bitMatrix.clear()

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

        let squareBit = new cv.Mat(squareSize, squareSize, cv.CV_8UC1)
        cv.threshold(square, squareBit, avg, 255, cv.THRESH_BINARY_INV)

        cv.subtract(squareBit, focus, squareBit)

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
          cv.fitLine(contour, line, cv.DIST_L12, 0, 0.01, 0.01) // [vx,vy,x,y]
          let vx = Math.abs(line.data32F[0])
          let vy = Math.abs(line.data32F[1])
          code = {
            value: (vx > vy) ? '1' : '0',
            probability: Math.max(vx, vy)
          }
          line.delete()
        }
        fullCode.push(code)
        if (code.value === '1') {
          bitMatrix.flip(col, row)
        }

        squareBit.copyTo(bitImage.roi(rectSquare))

        // let n = row * qrCodeSize + col
        // cv.rectangle(errorImage, new cv.Point(fromX, fromY), new cv.Point(fromX + squareSize - 1, fromY + squareSize - 1), new cv.Scalar(0, 0, 0, 255), 1)

        centroid.delete()
        hierarchy.delete()
        contours.delete()
        squareBit.delete()
        square.delete()
      }
    }
    // cv.addWeighted(bitImage, alpha, grayImage, 1 - alpha, 0, grayImage)

    cv.imshow('my-canvas-gray', grayImage)
    cv.imshow('my-canvas-bit', bitImage)

    // free memory
    focus.delete()
    grayImage.delete()
    rgbaPlanes.delete()
    errorImage.delete()
    image.delete()

    try {
      fullCode = this.qrRead(bitMatrix)
    } catch (e) {
      fullCode = ''
    }
    console.log(fullCode)
    const endTime = new Date()
    const duration = (endTime - startTime) / 1000
    console.log('decoding: ' + duration)
    return fullCode
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

  static encodeBinaryString (s) {
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
