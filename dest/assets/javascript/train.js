'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Train = function () {
  function Train(id, sprite, status, side) {
    _classCallCheck(this, Train);

    this.id = id;
    this.active = false;
    this.sprite = sprite;
    this.status = status;
    this.side = side;
    this.startX = 0;
    this.sprite.position = {
      x: 0,
      y: 0
    };
    this.sprite.scale = {
      x: 0.4,
      y: 0.4
    };
    this.sprite.anchor = {
      x: 0.5,
      y: 0.5
    };
  }

  _createClass(Train, [{
    key: 'moveTo',
    value: function moveTo(pos) {
      this.sprite.position = {
        x: pos.x,
        y: pos.y
      };
    }
  }, {
    key: 'easeTo',
    value: function easeTo(endPos, side, ease, callback) {
      var train = this;
      TweenLite.to(this.sprite.position, 1, {
        x: endPos,
        ease: ease,
        onUpdateParams: ['{self}'],
        onUpdate: function onUpdate(tween) {
          var x = tween.target.x;
          var y = getYPosition(tween.target.x, side);
          var trainRotation = Math.round(angle(train.sprite.position.x, train.sprite.position.y, x, y) * 100) / 100;
          train.sprite.position.y = y;
          train.sprite.rotation = trainRotation;
        },
        onComplete: function onComplete() {
          if (callback) {
            callback;
          }
        }
      });
    }
  }, {
    key: 'positionX',
    set: function set(x) {
      this.sprite.position.x = x;
    }
  }, {
    key: 'positionY',
    set: function set(y) {
      this.sprite.position.y = y;
    }
  }, {
    key: 'rotation',
    set: function set(deg) {
      this.sprite.rotation = deg;
    }
  }]);

  return Train;
}();