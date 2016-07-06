const LOADER = PIXI.loader;
const TRAINSTATUS = {
  0: 'in-line',
  1: 'station',
  2: 'on-track',
  3: 'finished',
  4: 'out-of-screen'
}
let stageWidth = window.innerWidth;
let stageHeight = window.innerHeight;
let pathContainer = document.querySelector('.route-container');
let path = document.querySelector('.train-route__path');
let renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight, {transparent: true, antialias: true});
let stage = new PIXI.Container();
let trains = {
  left: [],
  right: []
};
let stationPos = {
  left: stageWidth * 0.125,
  right: stageWidth - stageWidth * 0.125
}
// Momentum vars
let trackingPoints = [];
let friction = 0.92;
let stopThreshold = 0.3;




/*
 * Train helpers
 */

function getActiveTrain(side) {
  let activeTrain;
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




/*
 * Train animation
 */

function moveTrain(posX, side, train, callback, decVelX) {
  let yCorrection = 1.1042;
  let scale = path.getTotalLength() / pathContainer.offsetWidth;
  let svgX = Math.min(Math.max(pathContainer.getBoundingClientRect().left, posX), pathContainer.offsetWidth);
  let svgPosition = path.getPointAtLength((svgX - pathContainer.getBoundingClientRect().left) * scale);
  let posY = pathContainer.getBoundingClientRect().top;
  let currentPos = {
    x: train.train.position.x,
    y: train.train.position.y
  }
  let trainRotation = 0;

  if (side === 'left') {
    // animate down - top
    posY += (pathContainer.offsetHeight * 2) - (svgPosition.y * yCorrection / scale);
    posX = Math.max(posX, stationPos.left);
  } else {
    // animate top - down
    posY += (svgPosition.y * yCorrection / scale);
    posX = Math.min(posX, stationPos.right);
  }

  if (trainCollision(train.train)) {
    return;
  }

  trainRotation = Math.round(angle(currentPos.x, currentPos.y, posX, posY) * 100) / 100;
  train.train.position.x = posX;
  train.train.position.y = posY;
  train.train.rotation = trainRotation;

  if (callback) {
    requestAnimationFrame(() => {
      callback(side, posX, decVelX, train);
    });
  }
}

function momentumAnim(side, targetX, decVelX, train) {
  let maxX = stationPos.right;
  let minX = stationPos.left;
  let diff = 0;

	decVelX *= friction;
	targetX += decVelX;
  diff = (side === 'left' ? targetX - maxX : targetX - minX);

  if (Math.abs(diff) < 120 && Math.abs(diff) / 2 < decVelX) {
    decVelX  = Math.abs(diff) / 2;
  }

  targetX = (side === 'left' ? Math.min(targetX, maxX) : Math.max(targetX, minX));

	if (Math.abs(decVelX) > stopThreshold && targetX > minX && targetX < maxX) {
    moveTrain(targetX, side, train, momentumAnim, decVelX);
	} else {
    train.active = false;
  }
}

function startMomentum(side, train) {
  const MULTIPLIER = 1;
	let firstPoint = trackingPoints[0];
	let lastPoint = trackingPoints[trackingPoints.length - 1];
	let xOffset = lastPoint.x - firstPoint.x;
	let timeOffset = lastPoint.time - firstPoint.time;
	let D = (timeOffset / 15) / MULTIPLIER;
  let decVelX = (xOffset / D) || 0; // prevent NaN

  if (Math.abs(decVelX) > 1 ) {
		momentumAnim(side, lastPoint.x, decVelX, train);
	}
}

function addTrackingPoint(x, side, train) {
  let time = Date.now();
	while (trackingPoints.length > 0) {
		if (time - trackingPoints[0].time <= 100) {
			break;
		}
		trackingPoints.shift();
	}
	trackingPoints.push({x, time});
  moveTrain(x, side, train);
}





/*
 * Event listeners
 */

function onTouchStart(event) {
  let x;
  this.data = event.data;
  this.side = 'left';
  this.moving = true;
  x = this.data.getLocalPosition(this.parent).x;
  trackingPoints = [];
  if (x > stageWidth / 2) {
    this.side = 'right';
  }
  this.train = getActiveTrain(this.side);
  if (!this.train) {
    this.moving = false;
    return;
  }
  this.train.active = true;
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.train);
}

function onTouchMove() {
  if (this.moving) {
    addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.train);
  }
}

function onTouchEnd() {
  if (!this.moving) {
    return;
  }
  this.moving = false;
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.train);
  startMomentum(this.side, this.train);
  this.train.status = 2;
  setActiveTrain(this.side);
  this.data = null;
}




/*
 * Creating elements
 */

function createTrain(side, texture) {
  let train = new PIXI.Sprite(texture);
  let status = 1;
  let pathTop = pathContainer.getBoundingClientRect().top;
  let position = {
    x: (side === 'right' ? stationPos.right : stationPos.left),
    y: (side === 'right' ? pathTop : (pathTop + pathContainer.offsetHeight * 2))
  };

  train.scale.x = 0.4;
  train.scale.y = 0.4;
  train.anchor.x = 0.5;
  train.anchor.y = 0.5;
  train.position.x = position.x;
  train.position.y = position.y;

  for (var i = 0; i < trains[side].length; i++) {
    if (trains[side][i].status === 1) {
      status = 0;
      break;
    }
  }

  trains[side].push({train: train, status: status});
  stage.addChild(train);
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
  createInteractionZone({x: 0, y: 0});
  createInteractionZone({x: (stageWidth - stageWidth / 4), y: 0});
  createTrain('left', resources.train.texture);
  createTrain('left', resources.train.texture);
  createTrain('left', resources.train.texture);
  createTrain('left', resources.train.texture);
  createTrain('left', resources.train.texture);
  createTrain('right', resources.train.texture);
  createTrain('right', resources.train.texture);
  createTrain('right', resources.train.texture);
  createTrain('right', resources.train.texture);
  createTrain('right', resources.train.texture);

  // start animating
  animate();
}

function init() {
  document.body.appendChild(renderer.view);
  LOADER.add('train', '/assets/images/train.png')
        .load(onAssetsLoaded);
}

init();
