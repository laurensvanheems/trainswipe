// 0 = in-line
// 1 = station
// 2 = on-track
// 3 = finished
// 4 = out-of-screen

const LOADER = PIXI.loader;

let trainCounter = 0;
let stageWidth = window.innerWidth;
let stageHeight = window.innerHeight;
let pathContainer = document.querySelector('.route-container');
let path = document.querySelector('.train-route__path');
let renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight, {transparent: true});
let stage = new PIXI.Container();
let trainTexture;
let trains = {
  left: [],
  right: []
};
let stationPos = {
  left: stageWidth * 0.1,
  right: stageWidth - stageWidth * 0.1
}
// Momentum vars
let trackingPoints = [];
let friction = 0.92;
let stopThreshold = 0.3;



/*
 * Train helpers
 */

function getActiveTrain(side) {
  let activeTrain = false;
  for (var i = 0; i < trains[side].length; i++) {
    if (trains[side][i].status === 1) {
      activeTrain = trains[side][i];
    }
  }
  return activeTrain;
}

function setActiveTrain(side) {
  for (var i = 0; i < trains[side].length; i++) {
    if (trains[side][i].status === 0) {
      trains[side][i].status = 1;
      break;
    }
  }
}

function checkCollision(side, activeTrain) {
  let collision = false;
  for (var i = 0; i < trains[side].length; i++) {
    let xDist = 0;
    let yDist = 0;
    if ((trains[side][i].status === 2 || trains[side][i].status === 3) && trains[side][i].active !== true) {
      xDist = trains[side][i].train.position.x - activeTrain.position.x;
      if (Math.abs(xDist) < trains[side][i].train.width) {
        yDist = trains[side][i].train.position.y - activeTrain.position.y;
        if(Math.abs(yDist) < trains[side][i].train.height) {
          collision = true;
        }
      }
    }
  }
  return collision;
}

function trainCollision(train) {
  return checkCollision('left', train) || checkCollision('right', train);
}

function angle(cx, cy, ex, ey) {
  let dy = ey - cy;
  let dx = ex - cx;
  let theta = 0;
  if ((dy < -0.05 || dy > 0.05) && dx !== 0) {
    theta = Math.atan2(dy, dx); // range (-PI, PI]
  }
  return theta;
}

function getYPosition(x, side) {
  let scale = 800 / pathContainer.offsetWidth;
  let svgX = Math.min(Math.max(pathContainer.getBoundingClientRect().left, x), (pathContainer.offsetWidth + pathContainer.getBoundingClientRect().left));
  let svgPosition = path.getPointAtLength(svgX * scale - pathContainer.getBoundingClientRect().left);
  let y = pathContainer.getBoundingClientRect().top;

  if (side === 'left') {
    y += (pathContainer.offsetHeight * 2) - (svgPosition.y / scale);
  } else {
    y += (svgPosition.y / scale);
  }

  return y;
}




/*
 * Train animation
 */

function moveTrain(x, side, trainObj, callback, decVelX) {
  let posY;
  let posX = x + trainObj.startX;
  let currentPos = {
    x: trainObj.train.position.x,
    y: trainObj.train.position.y
  }
  let trainRotation = 0;

  if (side === 'left') {
    // animate left to right
    posX = Math.min(posX, stationPos.right);
  } else {
    // animate right to left
    posX = Math.max(posX, stationPos.left);
  }
  posY = getYPosition(posX, side);

  if (trainCollision(trainObj.train)) {
    return;
  }

  trainRotation = Math.round(angle(currentPos.x, currentPos.y, posX, posY) * 100) / 100;
  trainObj.train.position.x = posX;
  trainObj.train.position.y = posY;
  trainObj.train.rotation = trainRotation;

  if (callback) {
    requestAnimationFrame(() => {
      callback(side, x, trainObj, decVelX);
    });
  }
}

function momentumAnim(side, targetX, trainObj, decVelX) {
  let maxX = stationPos.right;
  let minX = stationPos.left;
  let diff = 0;

	decVelX *= friction;
	targetX += decVelX;
  diff = (side === 'left' ? targetX - maxX : targetX - minX);

  if (Math.abs(diff) < 120 && Math.abs(diff) / 2 < decVelX) {
    decVelX  = Math.abs(diff) / 2;
  }

  if (Math.abs(decVelX) > stopThreshold && Math.abs(targetX) > minX && Math.abs(targetX) < maxX) {
    moveTrain(targetX, side, trainObj, momentumAnim, decVelX);
	} else {
    moveTrainOutStation(side, trainObj);
  }
}

function startMomentum(side, trainObj) {
  const MULTIPLIER = 1;
	let firstPoint = trackingPoints[0];
	let lastPoint = trackingPoints[trackingPoints.length - 1];
	let xOffset = lastPoint.x - firstPoint.x;
	let timeOffset = lastPoint.time - firstPoint.time;
	let D = (timeOffset / 15) / MULTIPLIER;
  let decVelX = (xOffset / D) || 0; // prevent NaN

  if (Math.abs(decVelX) > 1 ) {
		momentumAnim(side, lastPoint.x, trainObj, decVelX);
	}
}

function addTrackingPoint(x, side, trainObj, startX) {
  let time = Date.now();
  x -= startX;
  while (trackingPoints.length > 0) {
		if (time - trackingPoints[0].time <= 100) {
			break;
		}
		trackingPoints.shift();
	}
	trackingPoints.push({x, time});
  moveTrain(x, side, trainObj);
}




/*
 * In and out sequence
 */

function moveTrainOutStation(side, trainObj) {
  let endPos = (stageWidth + trainObj.train.width);
  trainObj.active = false;
  easeTrainTo(endPos, side, trainObj, Power2.easeIn, false);
}

function moveTrainToStation(side, train) {
  let endPos = stationPos[side];
  train.easeTo(endPos, side, Power2.easeOut);
}





/*
 * Event listeners
 */

function onTouchStart(event) {
  let x;
  trackingPoints = [];
  this.data = event.data;
  x = this.data.getLocalPosition(this.parent).x;
  this.side = 'left';
  this.moving = true;
  this.startX = x;
  if (x > stageWidth / 2) {
    this.side = 'right';
  }
  this.train = getActiveTrain(this.side);
  if (!this.train) {
    this.moving = false;
    return;
  }
  this.train.startX = this.train.position.x;
  this.train.active = true;
  addTrackingPoint(x, this.side, this.trainObj, this.startX);
}

function onTouchMove() {
  if (this.moving) {
    addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.trainObj, this.startX);
  }
}

function onTouchEnd() {
  if (!this.moving) {
    return;
  }
  this.moving = false;
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.trainObj, this.startX);
  startMomentum(this.side, this.trainObj);
  this.trainObj.status = 2;
  setActiveTrain(this.side);
  this.data = null;
}




/*
 * Creating elements
 */

function createTrain(side, texture) {
  let sprite = new PIXI.Sprite(texture);
  let train = new Train(trainCounter, sprite, 0, side);
  let pathTop = pathContainer.getBoundingClientRect().top;

  trainCounter++;
  train.moveTo = {
    x: (side === 'right' ? stageWidth + sprite.width : 0 - sprite.width),
    y: (side === 'right' ? pathTop : (pathTop + pathContainer.offsetHeight * 2))
  };

  trains[side].push(train);
  stage.addChild(train.sprite);
  moveTrainToStation(side, train);
}

function createInteractionZone(position) {
  let zone = new PIXI.Graphics();
  zone.beginFill(0xFF0000);
  zone.alpha = 0.1;
  zone.drawRect(position.x, position.y, stageWidth / 4, stageHeight);
  zone.interactive = true;

  zone.on('touchstart', onTouchStart)
      .on('touchend', onTouchEnd)
      .on('touchendoutside', onTouchEnd)
      .on('touchmove', onTouchMove);

  stage.addChild(zone);
}





/*
 * Init functions
 */

function animate() {
  window.requestAnimationFrame(animate);
  renderer.render(stage);
}

function onAssetsLoaded(loader, resources) {
  trainTexture = resources.train.texture;
  createInteractionZone({x: 0, y: 0});
  createInteractionZone({x: (stageWidth - stageWidth / 4), y: 0});

  createTrain('left', trainTexture);
  // start animating
  animate();
}

function init() {
  document.body.appendChild(renderer.view);
  LOADER.add('train', '/assets/images/train.png')
        .load(onAssetsLoaded);
}

init();
