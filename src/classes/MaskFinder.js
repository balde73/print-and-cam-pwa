export default class MaskFinder {
  constructor (capture, debugMode = true) {
    this.capture = capture
    this.width = capture.video.width
    this.height = capture.video.height
    this.shot = new cv.Mat(this.height, this.width, cv.CV_8UC4)
    this.mask = null
    this.debugMode = debugMode
  }
  snapshot () {
    this.capture.read(this.shot)
    cv.imshow('shot', this.shot)
  }
  shotAndSearch () {
    this.capture.read(this.shot)
    console.log(this.shot)
    const cropped = this.search(this.shot)
    this.shot.delete()
    return cropped
  }
  easyTrack () {
    try {
      let src = new cv.Mat(this.height, this.width, cv.CV_8UC4)
      this.capture.read(src)
      let dst = new cv.Mat()
      let mask = new cv.Mat()
      cv.matchTemplate(src, this.trackMat, dst, cv.TM_CCOEFF, mask)
      let result = cv.minMaxLoc(dst, mask)
      console.log(result)
      let maxPoint = result.maxLoc

      src.delete()
      dst.delete()
      mask.delete()

      return {
        point: {
          x: maxPoint.x,
          y: maxPoint.y
        },
        value: 1
      }
    } catch (e) {
      console.log(e)
    }
  }
  shotAndTrack () {
    this.capture.read(this.shot)
    let orb = new cv.ORB()
    let kp1 = new cv.KeyPointVector()
    let des1 = new cv.Mat()
    let kp2 = new cv.KeyPointVector()
    let des2 = new cv.Mat()

    let mask = this.shot.roi(new cv.Rect(50, 50, 300, 300))

    console.log(mask)
    console.log(this.shot)

    orb.detectAndCompute(mask, new cv.Mat(), kp1, des1)
    orb.detectAndCompute(this.shot, new cv.Mat(), kp2, des2)

    console.log(kp1.size())
    console.log(kp2.size())
    try {
      // create BFMatcher object
      let bf = new cv.BFMatcher(cv.NORM_HAMMING, true)
      console.log(bf)
      // Match descriptors.
      let matches = new cv.DMatchVector()
      bf.match(des1, des2, matches)
      console.log(matches)
      // Sort them in the order of their distance.
      // matches = sorted(matches, key = lambda x:x.distance)
      // Draw first 10 matches.
      // img3 = cv.drawMatches(img1,kp1,img2,kp2,matches[:10], flags=2)
      // plt.imshow(img3),plt.show()
    } catch (e) {
      console.log(e)
    }
  }
  studyPortion (shotFreeze, rect) {
    console.log('start tracking')

    // hardcode the initial location of window
    this.trackWindow = rect
    console.log(this.trackWindow)

    // set up the ROI for tracking
    let roi = shotFreeze.roi(this.trackWindow)

    let hsvRoi = new cv.Mat()
    cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB)
    cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV)

    if (this.debugMode) {
      cv.imshow('my-canvas-video-1', roi)
    }

    let mask = new cv.Mat()
    let lowScalar = new cv.Scalar(30, 30, 0)
    let highScalar = new cv.Scalar(180, 180, 180)
    let low = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), lowScalar)
    let high = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), highScalar)
    cv.inRange(hsvRoi, low, high, mask)
    this.roiHist = new cv.Mat()
    let hsvRoiVec = new cv.MatVector()
    hsvRoiVec.push_back(hsvRoi)
    cv.calcHist(hsvRoiVec, [0], mask, this.roiHist, [180], [0, 180])
    cv.normalize(this.roiHist, this.roiHist, 0, 255, cv.NORM_MINMAX)

    // delete useless mats.
    roi.delete()
    hsvRoi.delete()
    mask.delete()
    low.delete()
    high.delete()
    hsvRoiVec.delete()

    // Setup the termination criteria, either 10 iteration or move by atleast 1 pt
    this.termCrit = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 1)

    this.hsv = new cv.Mat(this.height, this.width, cv.CV_8UC3)
    this.dst = new cv.Mat()
    this.hsvVec = new cv.MatVector()
    this.hsvVec.push_back(this.hsv)
    this.frame = new cv.Mat(this.height, this.width, cv.CV_8UC4)
    this.trackBox = null
  }

  processVideo () {
    console.log('> processing')
    try {
      // start processing.
      this.capture.read(this.frame)
      cv.cvtColor(this.frame, this.hsv, cv.COLOR_RGBA2RGB)
      cv.cvtColor(this.hsv, this.hsv, cv.COLOR_RGB2HSV)

      // console.log(this.hsvVec)
      cv.calcBackProject(this.hsvVec, [0], this.roiHist, this.dst, [0, 180], 1)
      // Apply meanshift to get the new location
      // and it also returns number of iterations meanShift took to converge,
      // which is useless in this demo.
      // let [, trackWindow] = cv.meanShift(this.dst, this.trackWindow, this.termCrit)

      console.log(this.dst)
      // apply camshift to get the new location
      let [trackBox, trackWindow] = cv.CamShift(this.dst, this.trackWindow, this.termCrit)
      this.trackWindow = trackWindow

      return {
        x: trackBox.center.x / this.width * 100,
        y: trackBox.center.y / this.height * 100
      }
    } catch (err) {
      console.log(err)
      return null
    }
  }

  search (photo, qrCodeSize, hardness = 1) {
    const startTime = new Date()
    let returnObj = null
    let width = photo.cols
    let height = photo.rows
    console.log('searchSize: ' + width + 'x' + height)
    let shotFreeze = new cv.Mat()
    let resizeRate = {
      width: 1,
      height: 1
    }
    if (height > 500 && hardness === 1) {
      height = 500
      const rate = height / photo.rows
      width = parseInt(width * rate)
      console.log('resize to: ' + width + 'x' + height)
      resizeRate = {
        width: photo.cols / width,
        height: photo.rows / height
      }
      cv.resize(photo, shotFreeze, new cv.Size(width, height), cv.INTER_CUBIC)
    } else {
      photo.copyTo(shotFreeze)
    }
    let gray = new cv.Mat(height, width, cv.CV_8UC4)
    cv.cvtColor(shotFreeze, gray, cv.COLOR_RGBA2GRAY, 0)
    let bestMask = null
    bestMask = this.__findMaskOneStep(gray, hardness)
    const intermediateTime = new Date()
    gray.delete()

    if (bestMask) {
      const widthCnt = bestMask.rect.width
      const heightCnt = bestMask.rect.height
      const minSizeCnt = Math.min(widthCnt, heightCnt)
      const minSize = Math.min(width, height)
      const sizeRate = minSizeCnt / minSize
      let cropped = null
      if (this.__pixelDensity(widthCnt, heightCnt) || hardness >= 1) {
        console.log('pixelDensity is good')
        let rect = this.__exploitPoints(bestMask.cnt, resizeRate)
        rect = this.__orderPoints(rect)
        cropped = this.__crop(photo, rect, qrCodeSize)
      }
      returnObj = {
        cropped: cropped,
        rect: this.__exploitRect(bestMask.rect, resizeRate),
        sizeRate: sizeRate
      }
    }
    const endTime = new Date()
    const duration = (endTime - startTime) / 1000
    const intermediateDuration = (intermediateTime - startTime) / 1000
    console.log('lines: ' + intermediateDuration)
    console.log('search: ' + duration)
    shotFreeze.delete()
    return returnObj
  }

  setDebugMode (value) {
    this.debugMode = value
  }

  // private methods
  __crop (img, bestMask, qrCodeSize) {
    const cropped = this.__fourPointTransform(img, bestMask, qrCodeSize)
    cv.imshow('canvasTransform', cropped)
    return cropped
  }

  __pixelDensity (width, height) {
    const area = width * height
    const squareArea = area / 4096
    return squareArea > 100
  }

  __drawRect (bestMask) {
    return false
  }

  __cleanRect (bestMask) {
    return false
  }

  __findMaskOneStep (gray, hardness = 1) {
    let grayBlur = new cv.Mat()
    let blackAndWhite = new cv.Mat()
    let ksize = new cv.Size(15, 15)
    cv.GaussianBlur(gray, grayBlur, ksize, 0, 0, cv.BORDER_DEFAULT)
    cv.adaptiveThreshold(grayBlur, blackAndWhite, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)

    if (this.debugMode) {
      cv.imshow('my-canvas-contours', blackAndWhite)
    }

    let mask = this.__findMask(blackAndWhite)
    grayBlur.delete()
    blackAndWhite.delete()
    return mask
  }

  __findMask (img) {
    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(img, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    hierarchy.delete()
    return this.__bestContour(contours)
  }

  __bestContour (contours) {
    let best = new cv.Mat()
    let bestRect = null
    let maxArea = 0
    let perc = 0

    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i)
      // You can try more different parameters
      const contourRect = cv.boundingRect(cnt)
      if (this.__contourOK(contourRect)) {
        let tmp = new cv.Mat()
        let peri = cv.arcLength(cnt, true)
        cv.approxPolyDP(cnt, tmp, 0.01 * peri, true)

        if (tmp.matSize[0] === 4) {
          const area = cv.contourArea(tmp)
          const {width, height} = contourRect
          const boundArea = width * height
          if (area > maxArea) {
            best = tmp.clone()
            bestRect = contourRect
            maxArea = area
            perc = area / boundArea
          }
        }
        tmp.delete()
      }
      cnt.delete()
    }
    return maxArea ? {
      rect: bestRect,
      cnt: best,
      perc
    } : null
  }
  __contourOK (contourRect) {
    // #####################
    // Check if the contour is a good predictor of photo location.
    // #####################

    if (this.__farFromCentroid(contourRect)) {
      return false // shouldn't far from centroids (focus)
    }
    if (this.__nearEdge(contourRect)) {
      return false // shouldn't be too near edges
    }
    if (this.__tooSmall(contourRect)) {
      return false // too small is bad
    }
    if (this.__tooBig(contourRect)) {
      return false
    }
    if (this.__tooSquishy(contourRect)) {
      return false // probably not a square
    }
    return true
  }

  __tooSquishy (rect) {
    // if too squishy probably is not a square
    const {width, height} = rect
    const maxSquareRation = 1.8
    if (width > maxSquareRation * height || height > maxSquareRation * width) {
      return true
    }
    return false
  }

  __tooSmall (rect) {
    const {width, height} = rect
    const iw = this.width
    const ih = this.height
    if (width < iw / 8 || height < ih / 8) {
      return true
    }
    if (width * height < ih * iw / 36) {
      return true
    }
    return false
  }

  __tooBig (rect) {
    const {width, height} = rect
    const iw = this.width
    const ih = this.height
    return (iw === width && ih === height)
  }

  __nearEdge (rect) {
    // Check if a rect is near the edge in the given image

    const {x, y, w, h} = rect
    const iw = this.width
    const ih = this.height
    const mm = 10 // margin in pixels
    return (
      x < mm ||
      x + w > iw - mm ||
      y < mm ||
      y + h > ih - mm
    )
  }

  __farFromCentroid (rect) {
    // please implement me!
    return false
  }

  // consider to move this
  __sortPntX (ptA, ptB) {
    if (ptA.x < ptB.x) {
      return 1
    }
    if (ptA.x > ptB.x) {
      return -1
    }
    return 0
  }

  __sortPntY (ptA, ptB) {
    if (ptA.y < ptB.y) {
      return -1
    }
    if (ptA.y > ptB.y) {
      return 1
    }
    return 0
  }

  __orderPoints (pts) {
    // initialzie a list of coordinates that will be ordered
    // such that the first entry in the list is the top-left,
    // the second entry is the top-right, the third is the
    // bottom-right, and the fourth is the bottom-left
    // rect = np.zeros((4, 2), dtype = 'float32')

    let points = pts.slice()
    points.sort(this.__sortPntY)

    let top = [ points[0], points[1] ]
    let bottom = [ points[2], points[3] ]

    top.sort(this.__sortPntX)
    bottom.sort(this.__sortPntX)

    return {
      tl: top[1],
      tr: top[0],
      bl: bottom[1],
      br: bottom[0]
    }
  }

  __exploitRect (rect, resizeRate = {width: 1, height: 1}) {
    return new cv.Rect(rect.x * resizeRate.width, rect.y * resizeRate.height, rect.width * resizeRate.width, rect.height * resizeRate.height)
  }

  __exploitPoints (points, resizeRate = {width: 1, height: 1}) {
    let rect = [[0, 0], [0, 0], [0, 0], [0, 0]]

    rect[0] = new cv.Point(parseInt(points.data32S[0] * resizeRate.width), parseInt(points.data32S[1] * resizeRate.height))
    rect[1] = new cv.Point(parseInt(points.data32S[2] * resizeRate.width), parseInt(points.data32S[3] * resizeRate.height))
    rect[2] = new cv.Point(parseInt(points.data32S[4] * resizeRate.width), parseInt(points.data32S[5] * resizeRate.height))
    rect[3] = new cv.Point(parseInt(points.data32S[6] * resizeRate.width), parseInt(points.data32S[7] * resizeRate.height))
    return rect
  }

  __fourPointTransform (image, rect, qrCodeSize) {
    // obtain a consistent order of the points and unpack them individually
    // rect = __orderPoints(pts)

    let {tl, tr, br, bl} = rect
    let origin = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])

    const finalSize = qrCodeSize * 30
    const hb = parseInt(finalSize * (2 / 96)) // 1470 + 30 + 30 = 1530
    const maxSize = finalSize + (hb * 2) // 870+18+18   prev. 1920 + 40 + 40
    let dsize = new cv.Size(maxSize, maxSize)

    // now that we have the dimensions of the new image, construct
    // the set of destination points to obtain a 'birds eye view',
    // (i.e. top-down view) of the image, again specifying points
    // in the top-left, top-right, bottom-right, and bottom-left
    // order
    let dst = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxSize - 1, 0, maxSize - 1, maxSize - 1, 0, maxSize - 1])

    // compute the perspective transform matrix and then apply it
    let M = cv.getPerspectiveTransform(origin, dst)

    let warped = new cv.Mat()
    cv.warpPerspective(image, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())

    let cuttingZone = new cv.Rect(hb, hb, parseInt(maxSize - (hb * 2)), parseInt(maxSize - (hb * 2)))
    warped = warped.roi(cuttingZone)

    // return the warped image
    return warped
  }
}
