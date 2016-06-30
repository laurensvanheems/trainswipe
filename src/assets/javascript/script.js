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
let paths = {
  left: document.querySelector('.path__bottom'),
  right: document.querySelector('.path__top')
}
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

function moveTrain(position, side) {
  let train = trains[side][0].train; // getActiveTrain();
  let scale = paths[side].getTotalLength() / stageWidth;
  let pos = paths[side].getPointAtLength(position * scale);

  console.log(pos);
  console.log(position);
  train.position.x = position;
  train.position.y = pos.y;
}

function momentumAnim(side, targetX, decVelX) {
	decVelX *= friction;
	targetX += decVelX;

	if (Math.abs(decVelX) > stopThreshold) {
    moveTrain(targetX, side);
    requestAnimationFrame(() => {
      momentumAnim(side, targetX, decVelX);
    });
	}
}

function startMomentum(side) {
  const MULTIPLIER = 1;
	let firstPoint = trackingPoints[0];
	let lastPoint = trackingPoints[trackingPoints.length - 1];
	let xOffset = lastPoint.x - firstPoint.x;
	let timeOffset = lastPoint.time - firstPoint.time;
	let D = (timeOffset / 15) / MULTIPLIER;
  let decVelX = (xOffset / D) || 0; // prevent NaN

	if (Math.abs(decVelX) > 1 ) {
		requestAnimationFrame(() => {
      momentumAnim(side, lastPoint.x, decVelX);
    });
	}
}

function addTrackingPoint(x, side) {
	var time = Date.now();
	while (trackingPoints.length > 0) {
		if (time - trackingPoints[0].time <= 100) {
			break;
		}
		trackingPoints.shift();
	}
	trackingPoints.push({x, time});
  moveTrain(x, side);
}




/*
 * Eventlisteners
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
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side);
}

function onTouchMove() {
  if (this.moving) {
    addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side);
  }
}

function onTouchEnd() {
  if (!this.moving) {
    return;
  }
  this.moving = false;
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side);
  startMomentum(this.side);
  this.data = null;
}




/*
 * Creating elements
 */

function createTrain(side, texture) {
  let train = new PIXI.Sprite(texture);
  let position = {x: 80, y: (stageHeight / 2 + 60)};
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
  trains[side].push({train: train, status: 0});
  stage.addChild(train);
}

function createInteractionZone(position) {
  let zone = new PIXI.Graphics;
  zone.beginFill(0xFF0000);
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
