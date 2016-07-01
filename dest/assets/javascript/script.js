'use strict';

var LOADER = PIXI.loader;
var TRAINSTATUS = {
  0: 'in-line',
  1: 'station',
  2: 'on-track',
  3: 'finished',
  4: 'out-of-screen'
};
var stageWidth = window.innerWidth;
var stageHeight = window.innerHeight;
var pathContainer = document.querySelector('.route-container');
var path = document.querySelector('.train-route__path');
var renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight, { transparent: true });
var stage = new PIXI.Container();
var trains = {
  left: [],
  right: []
};
// Momentum vars
var trackingPoints = [];
var friction = 0.92;
var stopThreshold = 0.3;

/*
 * Train animation
 */

function moveTrain(posX, side, train) {
  var correction = 1.1042;
  var scale = path.getTotalLength() / pathContainer.offsetWidth;
  var svgX = Math.min(Math.max(0, posX), stageWidth);
  var svgPosition = path.getPointAtLength((svgX - pathContainer.getBoundingClientRect().left) * scale);
  var posY = pathContainer.getBoundingClientRect().top;

  if (side === 'left') {
    // animate down - top
    posY += pathContainer.offsetHeight * 2 - svgPosition.y * correction / scale;
  } else {
    // animate top - down
    posY += svgPosition.y * correction / scale;
  }

  train.train.position.x = posX;
  train.train.position.y = posY;
}

function momentumAnim(side, targetX, decVelX, train) {
  decVelX *= friction;
  targetX += decVelX;

  if (Math.abs(decVelX) > stopThreshold) {
    moveTrain(targetX, side, train);
    requestAnimationFrame(function () {
      momentumAnim(side, targetX, decVelX, train);
    });
  }
}

function startMomentum(side, train) {
  var MULTIPLIER = 1;
  var firstPoint = trackingPoints[0];
  var lastPoint = trackingPoints[trackingPoints.length - 1];
  var xOffset = lastPoint.x - firstPoint.x;
  var timeOffset = lastPoint.time - firstPoint.time;
  var D = timeOffset / 15 / MULTIPLIER;
  var decVelX = xOffset / D || 0; // prevent NaN

  if (Math.abs(decVelX) > 1) {
    requestAnimationFrame(function () {
      momentumAnim(side, lastPoint.x, decVelX, train);
    });
  }
}

function addTrackingPoint(x, side, train) {
  var time = Date.now();
  while (trackingPoints.length > 0) {
    if (time - trackingPoints[0].time <= 100) {
      break;
    }
    trackingPoints.shift();
  }
  trackingPoints.push({ x: x, time: time });
  moveTrain(x, side, train);
}

/*
 * Train helpers
 */

function getActiveTrain(side) {
  var activeTrain = void 0;
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
  var x = void 0;
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
  var train = new PIXI.Sprite(texture);
  var position = { x: 80, y: stageHeight / 2 + 60 };
  var status = 1;
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

  trains[side].push({ train: train, status: status });
  stage.addChild(train);
}

function createInteractionZone(position) {
  var zone = new PIXI.Graphics();
  zone.beginFill(0xFF0000);
  zone.alpha = 0.1;
  zone.drawRect(position.x, position.y, stageWidth / 4, stageHeight);
  zone.interactive = true;

  zone.on('touchstart', onTouchStart).on('touchend', onTouchEnd).on('touchendoutside', onTouchEnd).on('touchmove', onTouchMove);

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
  createInteractionZone({ x: 0, y: 0 });
  createInteractionZone({ x: stageWidth - stageWidth / 4, y: 0 });
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
  LOADER.add('train', '/assets/images/train.png').load(onAssetsLoaded);
}

init();