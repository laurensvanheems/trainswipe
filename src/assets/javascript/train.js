class Train {
  constructor(id, sprite, status, side) {
    this.id = id;
    this.active = false;
    this.sprite = sprite;
    this.status = status;
    this.side = side;
    this.startX = 0;
    this.sprite.position = {
      x: 0,
      y: 0
    }
    this.sprite.scale = {
      x: 0.4,
      y: 0.4
    };
    this.sprite.anchor = {
      x: 0.5,
      y: 0.5
    }
  }

  set positionX(x) {
    this.sprite.position.x = x;
  }
  set positionY(y) {
    this.sprite.position.y = y;
  }
  set rotation(deg) {
    this.sprite.rotation = deg;
  }

  moveTo(pos) {
    this.sprite.position = {
      x: pos.x,
      y: pos.y
    }
  }

  easeTo(endPos, side, ease, callback) {
    let train = this;
    TweenLite.to(
      this.sprite.position,
      1,
      {
        x: endPos,
        ease: ease,
        onUpdateParams: ['{self}'],
        onUpdate: function(tween) {
          let x = tween.target.x;
          let y = getYPosition(tween.target.x, side);
          let trainRotation = Math.round(angle(train.sprite.position.x, train.sprite.position.y, x, y) * 100) / 100;
          train.sprite.position.y = y;
          train.sprite.rotation = trainRotation;
        },
        onComplete: function() {
          if (callback) {
            callback;
          }
        }
      });
  }
}
