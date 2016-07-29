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
var trainTexture = void 0;
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

function getYPosition(x, side) {
  var scale = 800 / pathContainer.offsetWidth;
  var svgX = Math.min(Math.max(pathContainer.getBoundingClientRect().left, x), pathContainer.offsetWidth + pathContainer.getBoundingClientRect().left);
  var svgPosition = path.getPointAtLength(svgX * scale - pathContainer.getBoundingClientRect().left);
  var y = pathContainer.getBoundingClientRect().top;

  if (side === 'left') {
    y += pathContainer.offsetHeight * 2 - svgPosition.y / scale;
  } else {
    y += svgPosition.y / scale;
  }

  return y;
}

/*
 * Train animation
 */

function moveTrain(x, side, trainObj, callback, decVelX) {
  var posY = void 0;
  var posX = x + trainObj.startX;
  var currentPos = {
    x: trainObj.train.position.x,
    y: trainObj.train.position.y
  };
  var trainRotation = 0;

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
    requestAnimationFrame(function () {
      callback(side, x, trainObj, decVelX);
    });
  }
}

function momentumAnim(side, targetX, trainObj, decVelX) {
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
    moveTrainOutStation(side, trainObj);
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
    momentumAnim(side, lastPoint.x, trainObj, decVelX);
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
 * In and out sequence
 */

function easeTrainTo(endPos, side, trainObj, ease) {
  var currentPos = {};
  TweenLite.to(trainObj.train.position, 1, {
    x: endPos,
    ease: ease,
    onUpdateParams: ['{self}'],
    onUpdate: function onUpdate(tween) {
      var x = tween.target.x;
      var y = getYPosition(tween.target.x, side);
      var trainRotation = Math.round(angle(currentPos.x, currentPos.y, x, y) * 100) / 100;
      trainObj.train.position.y = getYPosition(tween.target.x, side);
      trainObj.train.rotation = trainRotation;
      currentPos.x = x;
      currentPos.y = y;
    },
    onComplete: function onComplete() {
      trainObj.status = 1;
    }
  });
}

function moveTrainOutStation(side, trainObj) {
  var endPos = stageWidth + trainObj.train.width;
  trainObj.active = false;
  easeTrainTo(endPos, side, trainObj, Power2.easeIn);
}

function moveTrainToStation(side, trainObj) {
  var endPos = stationPos[side];
  easeTrainTo(endPos, side, trainObj, Power2.easeOut);
}

/*
 * Event listeners
 */

function onTouchStart(event) {
  var x = void 0;
  this.data = event.data;
  x = this.data.getLocalPosition(this.parent).x;
  this.side = 'left';
  this.moving = true;
  this.startX = x;
  trackingPoints = [];
  if (x > stageWidth / 2) {
    this.side = 'right';
  }
  this.trainObj = getActiveTrain(this.side);
  if (!this.trainObj) {
    this.moving = false;
    return;
  }
  this.trainObj.startX = this.trainObj.train.position.x;
  this.trainObj.active = true;
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
  var train = new PIXI.Sprite(texture);
  var status = 0;
  var pathTop = pathContainer.getBoundingClientRect().top;
  var position = {
    x: side === 'right' ? stageWidth + train.width : 0 - train.width,
    y: side === 'right' ? pathTop : pathTop + pathContainer.offsetHeight * 2
  };
  var trainObj = { train: train, status: status, startX: 0 };
  trains[side].push(trainObj);

  train.scale.x = 0.4;
  train.scale.y = 0.4;
  train.anchor.x = 0.5;
  train.anchor.y = 0.5;
  train.position.x = position.x;
  train.position.y = position.y;

  stage.addChild(train);
  moveTrainToStation(side, trainObj);
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
  trainTexture = resources.train.texture;
  createInteractionZone({ x: 0, y: 0 });
  createInteractionZone({ x: stageWidth - stageWidth / 4, y: 0 });

  createTrain('left', trainTexture);
  // start animating
  animate();
}

function init() {
  document.body.appendChild(renderer.view);
  LOADER.add('train', '/assets/images/train.png').load(onAssetsLoaded);
}

init();