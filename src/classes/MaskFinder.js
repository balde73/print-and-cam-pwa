export default class MaskFinder {
  constructor (capture, levels = 5, initialLight = 50) {
    this.capture = capture
    this.width = capture.video.width
    this.height = capture.video.height
    this.shot = new cv.Mat(this.height, this.width, cv.CV_8UC4)
    this.levels = levels
    this.initialLight = initialLight
    this.mask = null
  }
  snapshot () {
    this.capture.read(this.shot)
    cv.imshow('shot', this.shot)
  }
  setLevels (levels) {
    this.levels = levels
  }
  setInitialLight (light) {
    this.initialLight = light
  }
  getLightLevels () {
    let light = this.initialLight
    const steps = this.levels
    // const maxStep = parseInt((255 - light) / 3 * 2)
    const maxStep = Math.min(255, light + steps * 5)
    console.log(light + steps * 5)
    const step = parseInt((maxStep - light) / steps)
    let lightLevels = []
    for (let i = 0; i < this.levels; i++) {
      lightLevels.push(light)
      light = light + step
    }
    console.log(lightLevels)
    return lightLevels
  }
  shotAndSearch () {
    this.capture.read(this.shot)
    console.log(this.shot)
    const cropped = this.search(this.shot)
    this.shot.delete()
    return cropped
  }
  shotAndTrack () {
    this.capture.read(this.shot)
    let orb = new cv.ORB()
    let kp1 = new cv.KeyPointVector()
    let des1 = new cv.Mat()
    let kp2 = new cv.KeyPointVector()
    let des2 = new cv.Mat()

    console.log(this.mask)
    console.log(this.shot)

    orb.detectAndCompute(this.mask, new cv.Mat(), kp1, des1)
    orb.detectAndCompute(this.shot, new cv.Mat(), kp2, des2)

    console.log(kp1.size())
    console.log(kp2.size())
    try {
      // create BFMatcher object
      let bf = new cv.BFMatcher(cv.NORM_HAMMING, true)
      console.log(bf)
      // Match descriptors.
      // let matches = new cv.MatVector()
      // bf.match(des1, des2, matches)
      // console.log(matches)
      // Sort them in the order of their distance.
      // matches = sorted(matches, key = lambda x:x.distance)
      // Draw first 10 matches.
      // img3 = cv.drawMatches(img1,kp1,img2,kp2,matches[:10], flags=2)
      // plt.imshow(img3),plt.show()
    } catch (e) {
      console.log(e)
    }
  }
  trackPortion (shotFreeze, x1, y1, x2, y2) {
    console.log('start tracking')
    console.log(x1 + ' ' + y1 + ' ' + x2 + ' ' + y2)
    // take first frame of the video

    console.log(shotFreeze)
    let heightRect = y2 - y1
    let widthRect = x2 - x1

    // hardcode the initial location of window
    this.trackWindow = new cv.Rect(x1, y1, widthRect, heightRect)
    console.log(this.trackWindow)

    // set up the ROI for tracking
    let roi = shotFreeze.roi(this.trackWindow)
    let hsvRoi = new cv.Mat()
    cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB)
    cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV)
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
    this.processVideo()
  }

  processVideo () {
    console.log('processing')
    const FPS = 60
    try {
      let begin = Date.now()

      // start processing.
      this.capture.read(this.frame)
      cv.cvtColor(this.frame, this.hsv, cv.COLOR_RGBA2RGB)
      cv.cvtColor(this.hsv, this.hsv, cv.COLOR_RGB2HSV)
      cv.calcBackProject(this.hsvVec, [0], this.roiHist, this.dst, [0, 180], 1)

      // Apply meanshift to get the new location
      // and it also returns number of iterations meanShift took to converge,
      // which is useless in this demo.
      let [, trackWindow] = cv.meanShift(this.dst, this.trackWindow, this.termCrit)
      console.log(trackWindow)
      this.trackWindow = trackWindow

      // Draw it on image
      let [x, y, w, h] = [this.trackWindow.x, this.trackWindow.y, this.trackWindow.width, this.trackWindow.height]
      cv.rectangle(this.frame, new cv.Point(x, y), new cv.Point(x + w, y + h), [255, 0, 0, 255], 2)
      cv.imshow('my-canvas-video', this.frame)

      // schedule the next one.
      let delay = 1000 / FPS - (Date.now() - begin)
      setTimeout(() => {
        this.processVideo()
      }, delay)
    } catch (err) {
      console.log(err)
    }
  }

  search (photo) {
    const width = photo.cols
    const height = photo.rows
    console.log('searchSize: ' + width + 'x' + height)
    const lightLevels = this.getLightLevels()
    let shotFreeze = new cv.Mat(height, width, cv.CV_8UC4)
    let gray = new cv.Mat(height, width, cv.CV_8UC4)
    let tmp = new cv.Mat(height, width, cv.CV_8UC4)
    photo.copyTo(shotFreeze)
    cv.cvtColor(shotFreeze, gray, cv.COLOR_RGBA2GRAY, 0)
    let mask = null
    let bestMask = null
    for (let i = 0; i < lightLevels.length; i++) {
      let level = lightLevels[i]
      cv.threshold(gray, tmp, level, 255, cv.THRESH_BINARY)
      mask = this.__findMask(tmp)
      if (mask != null) {
        // cv.drawContours(shotFreeze, mask, -1, new cv.Scalar(0, 0, 0), 1)
        bestMask = mask
      } else if (bestMask) {
        console.log('break!')
        break
      }
      cv.imshow(`bw-threshold-${i}`, tmp)
    }

    let cropped = null
    if (bestMask) {
      console.log('mask found!')
      this.__drawRect(bestMask)
      cropped = this.__crop(shotFreeze, bestMask)
      this.mask = cropped

      // start recording position
      let rect = this.__exploitPoints(bestMask)
      let {tl, br} = this.__orderPoints(rect)
      console.log(rect)
      this.trackPortion(shotFreeze, tl.x, tl.y, br.x, br.y)
    } else {
      console.log('nothing found')
      this.__cleanRect(bestMask)
    }
    tmp.delete()
    gray.delete()
    shotFreeze.delete()
    return cropped
  }

  // private methods
  __crop (img, bestMask) {
    const cropped = this.__fourPointTransform(img, bestMask)
    cv.imshow('canvasTransform', cropped)
    return cropped
  }

  __drawRect (bestMask) {
    return false
  }

  __cleanRect (bestMask) {
    return false
  }

  __findMask (img) {
    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(img, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    contours = this.__filterContours(contours)
    return this.__getMask(contours)
  }

  __getMask (contours) {
    let myhull = new cv.MatVector()
    let best = new cv.Mat()
    let maxArea = 0

    for (let i = 0; i < contours.size(); ++i) {
      let contour = contours.get(i)

      // approximate the contour
      let peri = cv.arcLength(contour, true)
      let tmp = new cv.Mat()
      cv.approxPolyDP(contour, tmp, 0.01 * peri, true)
      if (tmp.matSize[0] === 4) {
        // x, y, w, h = cv.boundingRect(contour)
        let area = cv.contourArea(tmp)

        if (area > maxArea) {
          best = tmp
          maxArea = area
        }
      }
    }
    myhull.push_back(best)
    return maxArea ? myhull : null
  }
  __filterContours (contours) {
    let hull = new cv.MatVector()
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i)
      // You can try more different parameters
      if (this.__contourOK(cnt)) {
        hull.push_back(cnt)
      }
      cnt.delete()
    }
    return hull
  }
  __contourOK (contour) {
    // #####################
    // Check if the contour is a good predictor of photo location.
    // #####################

    const contourRect = cv.boundingRect(contour) // returning {x, y, width, height}
    if (this.__farFromCentroid(contourRect)) {
      return false // shouldn't far from centroids (focus)
    }
    /*
      if __nearEdge(img, contourRect){
      return false // shouldn't be too near edges
    */
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
    const maxSquareRation = 2
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

  __exploitPoints (matrix) {
    let rect = [[0, 0], [0, 0], [0, 0], [0, 0]]

    const points = matrix.get(0)
    rect[0] = new cv.Point(points.data32S[0], points.data32S[1])
    rect[1] = new cv.Point(points.data32S[2], points.data32S[3])
    rect[2] = new cv.Point(points.data32S[4], points.data32S[5])
    rect[3] = new cv.Point(points.data32S[6], points.data32S[7])
    return rect
  }

  __fourPointTransform (image, pts) {
    // obtain a consistent order of the points and unpack them individually
    // rect = __orderPoints(pts)
    let rect = this.__exploitPoints(pts)
    rect = this.__orderPoints(rect)

    let {tl, tr, br, bl} = rect
    let origin = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])

    // compute the width of the new image, which will be the
    // maximum distance between bottom-right and bottom-left
    // x-coordiates or the top-right and top-left x-coordinates
    const widthA = Math.sqrt(((br.x - bl.x) ** 2) + ((br.y - bl.y) ** 2))
    const widthB = Math.sqrt(((tr.x - tl.x) ** 2) + ((tr.y - tl.y) ** 2))
    const maxWidth = Math.max(parseInt(widthA), parseInt(widthB))

    // compute the height of the new image, which will be the
    // maximum distance between the top-right and bottom-right
    // y-coordinates or the top-left and bottom-left y-coordinates
    const heightA = Math.sqrt(((tr.x - br.x) ** 2) + ((tr.y - br.y) ** 2))
    const heightB = Math.sqrt(((tl.x - bl.x) ** 2) + ((tl.y - bl.y) ** 2))
    const maxHeight = Math.max(parseInt(heightA), parseInt(heightB))

    // now that we have the dimensions of the new image, construct
    // the set of destination points to obtain a 'birds eye view',
    // (i.e. top-down view) of the image, again specifying points
    // in the top-left, top-right, bottom-right, and bottom-left
    // order
    let dst = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1])

    // compute the perspective transform matrix and then apply it
    let M = cv.getPerspectiveTransform(origin, dst)

    let warped = new cv.Mat()
    let dsize = new cv.Size(maxWidth, maxHeight)
    cv.warpPerspective(image, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
    const maxSize = 3598
    let maxsize = new cv.Size(maxSize, maxSize)
    cv.resize(warped, warped, maxsize, cv.INTER_CUBIC)

    const hb = parseInt(maxSize / 12.05 + 0.5)

    let cuttingZone = new cv.Rect(hb, hb, parseInt(maxSize - (hb * 2)), parseInt(maxSize - (hb * 2)))
    warped = warped.roi(cuttingZone)

    // return the warped image
    return warped
  }
}
