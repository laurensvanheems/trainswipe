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
var stationPos = {
  left: stageWidth * 0.1,
  right: stageWidth - stageWidth * 0.1
};
// Momentum vars
var trackingPoints = [];
var friction = 0.94;
var stopThreshold = 0.3;

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

function checkCollision(side, activeTrain) {
  var collision = false;
  for (var i = 0; i < trains[side].length; i++) {
    var xDist = 0;
    var yDist = 0;
    if ((trains[side][i].status === 2 || trains[side][i].status === 3) && trains[side][i].active !== true) {
      xDist = trains[side][i].train.position.x - activeTrain.position.x;
      if (Math.abs(xDist) < trains[side][i].train.width) {
        yDist = trains[side][i].train.position.y - activeTrain.position.y;
        if (Math.abs(yDist) < trains[side][i].train.height) {
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
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = 0;
  if ((dy < -0.05 || dy > 0.05) && dx !== 0) {
    theta = Math.atan2(dy, dx); // range (-PI, PI]
  }
  return theta;
}

/*
 * Train animation
 */

function moveTrain(x, side, trainObj, callback, decVelX) {
  var scale = 800 / pathContainer.offsetWidth;
  var posX = x + trainObj.startX;
  var svgX = Math.min(Math.max(pathContainer.getBoundingClientRect().left, posX), pathContainer.offsetWidth + pathContainer.getBoundingClientRect().left);
  var svgPosition = path.getPointAtLength(svgX * scale - pathContainer.getBoundingClientRect().left);
  var posY = pathContainer.getBoundingClientRect().top;
  var currentPos = {
    x: trainObj.train.position.x,
    y: trainObj.train.position.y
  };
  var trainRotation = 0;

  if (side === 'left') {
    // animate left to right
    posY += pathContainer.offsetHeight * 2 - svgPosition.y / scale;
    posX = Math.min(posX, stationPos.right);
  } else {
    // animate right to left
    posY += svgPosition.y / scale;
    posX = Math.max(posX, stationPos.left);
  }

  if (trainCollision(trainObj.train)) {
    return;
  }

  trainRotation = Math.round(angle(currentPos.x, currentPos.y, posX, posY) * 100) / 100;
  trainObj.train.position.x = posX;
  trainObj.train.position.y = posY;
  trainObj.train.rotation = trainRotation;

  if (callback) {
    requestAnimationFrame(function () {
      callback(side, x, decVelX, trainObj);
    });
  }
}

function momentumAnim(side, targetX, decVelX, trainObj) {
  var maxX = stationPos.right;
  var minX = stationPos.left;
  var diff = 0;

  decVelX *= friction;
  targetX += decVelX;
  diff = side === 'left' ? targetX - maxX : targetX - minX;

  if (Math.abs(diff) < 120 && Math.abs(diff) / 2 < decVelX) {
    decVelX = Math.abs(diff) / 2;
  }

  if (Math.abs(decVelX) > stopThreshold && Math.abs(targetX) > minX && Math.abs(targetX) < maxX) {
    moveTrain(targetX, side, trainObj, momentumAnim, decVelX);
  } else {
    trainObj.active = false;
  }
}

function startMomentum(side, trainObj) {
  var MULTIPLIER = 1;
  var firstPoint = trackingPoints[0];
  var lastPoint = trackingPoints[trackingPoints.length - 1];
  var xOffset = lastPoint.x - firstPoint.x;
  var timeOffset = lastPoint.time - firstPoint.time;
  var D = timeOffset / 15 / MULTIPLIER;
  var decVelX = xOffset / D || 0; // prevent NaN

  if (Math.abs(decVelX) > 1) {
    momentumAnim(side, lastPoint.x, decVelX, trainObj);
  }
}

function addTrackingPoint(x, side, trainObj, startX) {
  var time = Date.now();
  x -= startX;
  while (trackingPoints.length > 0) {
    if (time - trackingPoints[0].time <= 100) {
      break;
    }
    trackingPoints.shift();
  }
  trackingPoints.push({ x: x, time: time });
  moveTrain(x, side, trainObj);
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
  this.startX = x;
  trackingPoints = [];
  if (x > stageWidth / 2) {
    this.side = 'right';
  }
  this.trainObj = getActiveTrain(this.side);
  this.trainObj.startX = this.trainObj.train.position.x;
  if (!this.trainObj) {
    this.moving = false;
    return;
  }
  this.trainObj.active = true;
  addTrackingPoint(this.data.getLocalPosition(this.parent).x, this.side, this.trainObj, this.startX);
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
  var train = new PIXI.Sprite(texture);
  var status = 1;
  var pathTop = pathContainer.getBoundingClientRect().top;
  var position = {
    x: side === 'right' ? stationPos.right : stationPos.left,
    y: side === 'right' ? pathTop : pathTop + pathContainer.offsetHeight * 2
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