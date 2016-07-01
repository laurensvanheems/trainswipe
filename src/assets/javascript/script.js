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
let renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight, {transparent: true});
let stage = new PIXI.Container();
let trains = {
  left: [],
  right: []
};
// Momentum vars
let trackingPoints = [];
let friction = 0.92;
let stopThreshold = 0.3;





/*
 * Train animation
 */

function moveTrain(posX, side, train) {
  let correction = 1.1042;
  let scale = path.getTotalLength() / pathContainer.offsetWidth;
  let svgX = Math.min(Math.max(0, posX), stageWidth);
  let svgPosition = path.getPointAtLength((svgX - pathContainer.getBoundingClientRect().left) * scale);
  let posY = pathContainer.getBoundingClientRect().top;

  if (side === 'left') {
    // animate down - top
    posY += (pathContainer.offsetHeight * 2) - (svgPosition.y * correction / scale);
  } else {
    // animate top - down
    posY += (svgPosition.y * correction / scale);
  }

  train.train.position.x = posX;
  train.train.position.y = posY;
}

function momentumAnim(side, targetX, decVelX, train) {
	decVelX *= friction;
	targetX += decVelX;

	if (Math.abs(decVelX) > stopThreshold) {
    moveTrain(targetX, side, train);
    requestAnimationFrame(() => {
      momentumAnim(side, targetX, decVelX, train);
    });
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
		requestAnimationFrame(() => {
      momentumAnim(side, lastPoint.x, decVelX, train);
    });
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
  let position = {x: 80, y: (stageHeight / 2 + 60)};
  let status = 1;
  if (side === 'right') {
    position.x = stageWidth - 80;
    position.y = stageHeight / 2 - 60;
  }
  train.scale.x = 0.5;
  train.scale.y = 0.5;
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
  let zone = new PIXI.Graphics;
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

  // start animating
  animate();
}

function init() {
  document.body.appendChild(renderer.view);
  LOADER.add('train', '/assets/images/train.png')
        .load(onAssetsLoaded);
}

init();
