// Note: these classes have their own width/height fields, so inside them it's always
// this.width / this.height; bare width/height would be the p5 canvas size.
// Positions are in logical pixels; mouse position comes from mx(), my().

class GuiElement {
  name = "";
  width = 0; height = 0; x0 = 0; y0 = 0;

  update() {return false;}

  offerMousePress() {return false;}

  position() {
    return [this.x0, this.y0, this.width, this.height];
  }
}



class Button extends GuiElement {
  neutralColor; activeColor; highlightColor;
  backgroundColor = color(255);
  // these make a color palette, that can be used in different ways.
  // use foreColor() and bkgndColor() for drawing.
  active = false;
  pressed = false;
  hidden = false;
  thetextsize = 9;
  leading = 0.8;

  construct(name0, rect, neutral, actv) {
    this.neutralColor = neutral;
    this.activeColor = actv;
    this.highlightColor = lerpColor(this.activeColor,color(0),0.25);
    this.x0 = rect[0]; this.y0 = rect[1]; this.width = rect[2]; this.height = rect[3];
    this.name = name0;
  }

  drawFace() {
    noStroke();
    fill(this.foreColor());
    rectMode(CORNER);
    rect(this.x0,this.y0,this.width,this.height);
  }

  drawName() {
    fill(this.bkgndColor());
    textAlign(CENTER);
    textSize(this.thetextsize);
    textLeading(this.leading*this.thetextsize);
    // floor: thetextsize is an int in the original, so this was integer division
    text(this.name,this.x0+this.width/2,this.y0+this.height/2+Math.floor(this.thetextsize/2));
  }

  foreColor() {
    if (this.pressed) {
      return(this.highlightColor);
    } else if (this.over()) {
      return(this.activeColor);
    } else {
      return(this.neutralColor);
    }
  }

  bkgndColor() {
    return this.backgroundColor;
  }

  draw() {
    if (!this.hidden) {
      this.drawFace();
      this.drawName();
    }
  }

  over() {
    return (((mx()>=this.x0) && (mx()<=this.x0+this.width)) && ((my()>=this.y0) && (my()<=this.y0+this.height)));
  }

  offerMousePress() {
    this.pressed = this.over() && (!this.hidden);
    return this.pressed;
  }

  update() {
    // returns true when the button is released.
    let result = false;
    if (this.pressed) {
      this.active = this.over();
      this.pressed = mouseIsPressed;
    }
    if (this.active && (!mouseIsPressed)) {
      this.pressed = false;
      this.active = false;
      result = true;
    }
    this.draw();
    return result;
  }

}


class TextButton extends Button {

  constructor(name0, rect, neutral, actv) {
    super();
    this.construct(name0, rect, neutral, actv);
    this.thetextsize = round(this.height/3);
  }
}



class Slider extends GuiElement {
  neutralColor; activeColor; highlightColor;
  backgroundColor = color(255);
  // these define a color palette, that can be used in different ways.
  // use foreColor() and bkgndColor() for drawing.
  indicatorWidth;
  active = false;
  pressed = false;
  hidden = false;
  showName = true;
  showVal = true;
  nameTextSize; valTextSize;
  leading = 0.8;
  decimalPlaces = 2;
  quantized = false;
  quantizeUnit;

  dataMin; dataMax;
  logScale = false;
  pos = 0.5; // current position, 0..1

  constructor(name0, rect, neutral, actv, minVal, maxVal) {
    super();
    this.neutralColor = neutral;
    this.activeColor = actv;
    this.highlightColor = lerpColor(this.activeColor,color(0),0.25);
    this.x0 = rect[0]; this.y0 = rect[1]; this.width = rect[2]; this.height = rect[3];
    this.indicatorWidth = this.height;
    this.nameTextSize = this.height;
    this.valTextSize = 1.2*this.height;
    this.name = name0;
    this.dataMin = minVal;
    this.dataMax = maxVal;
  }

  quantize(unit) {
    this.quantized = true;
    this.quantizeUnit = unit;
    if (abs(unit-round(unit)) < 1e-6) {
      this.decimalPlaces = 0;
    }
    this.setVal(this.getVal());
  }

  foreColor() {
    if (this.pressed) {
      return(this.highlightColor);
    } else if (this.over()) {
      return(this.activeColor);
    } else {
      return(this.neutralColor);
    }
  }

  bkgndColor() {
    return this.backgroundColor;
  }

  drawBar() {
    rectMode(CORNER);
    noStroke();
    fill(this.bkgndColor());
    rect(this.x0,this.y0,this.width,this.height);
    fill(this.foreColor());
    const x1 = this.x0 + (this.width-this.indicatorWidth)*this.getPos();
    rect(x1,this.y0,this.indicatorWidth,this.height);
  }

  drawName() {
    fill(this.foreColor());
    textAlign(RIGHT);
    textSize(this.nameTextSize);
    textLeading(this.leading*this.nameTextSize);
    text(this.name+" ",this.x0,this.y0+this.height);
  }

  drawVal() {
    fill(this.foreColor());
    textAlign(LEFT);
    textSize(this.valTextSize);
    textLeading(this.leading*this.valTextSize);
    text(" "+this.val2string(this.getVal()), this.x0+this.width, this.y0+this.height);
  }

  draw() {
    if (!this.hidden) {
      this.drawBar();
      if (this.showName) {this.drawName();}
      if (this.showVal) {this.drawVal();}
    }
  }

  over() {
    return (((mx()>=this.x0) && (mx()<=this.x0+this.width)) && ((my()>=this.y0) && (my()<=this.y0+this.height)));
  }

  offerMousePress() {
    this.pressed = this.over() && (!this.hidden);
    return this.pressed;
  }

  update() {
    // returns true if the user is changing the position of the slider.
    let result = false;
    if (!this.hidden) {
      this.pressed = this.pressed && mouseIsPressed;
      this.active = this.over() && this.pressed;
      if (this.active) {
        const newpos = (mx() - this.x0) / (this.width - this.indicatorWidth);
        if (newpos != this.getPos()) {
          this.setPos(newpos);
          result = true;
        }
      }
      this.draw();
    }
    return result;
  }

  // use these four routines for reading & changing the position of the slider.
  // pos = relative position, 0..1
  // val = value in data units
  getPos() {return this.pos;}
  getVal() {return this.pos2val(this.getPos());}
  setPos(p) {this.pos = constrain(p, 0, 1);}
  setVal(v) {this.setPos(this.val2pos(v));}

  // these are general conversion functions, that can be used for values other than the current one
  // e.g., to find out the current min and max values allowed, use pos2val(0) and pos2val(1)
  val2string(v) {
    if (this.decimalPlaces==0) {
      return str(round(v));
    } else {
      const p = pow(10,this.decimalPlaces);
      let s = str(round(v*p)/p);
      if (!s.includes(".")) s += ".0";  // match Java's float formatting: 1.0, not 1
      return s;
    }
  }

  val2pos(v) {
    let p;
    if (this.quantized) {
      v = round(v/this.quantizeUnit)*this.quantizeUnit;
    }
    if (this.logScale) {
      p = (log(v)-log(this.dataMin))/(log(this.dataMax)-log(this.dataMin));
    } else {
      p = (v-this.dataMin)/(this.dataMax-this.dataMin);
    }
    return p;
  }

  pos2val(p) {
    let v;
    if (this.logScale) {
      v = this.dataMin * pow(this.dataMax/this.dataMin, p);
    } else {
      v = this.dataMin + (this.dataMax-this.dataMin) * p;
    }
    if (this.quantized) {
      v = round(v/this.quantizeUnit)*this.quantizeUnit;
    }
    return v;
  }

}





class Toolbar extends GuiElement {
  elements;
  spacing;
  length = 0; // number of defined elements
  unoccupiedX0; unoccupiedWidth;
  hidden = false;
  lastSliderAdded; // this is a kluge to make the "below" option work: elements[length-1].x0 returns 0 when elements[length-1] is a slider
  lastUpdated = null;

  constructor(rect, maxElements) {
    super();
    this.elements = new Array(maxElements).fill(null);
    this.x0 = rect[0]; this.y0 = rect[1]; this.width = rect[2]; this.height = rect[3];
    this.spacing = this.height/2;
    this.unoccupiedX0 = this.x0;
    this.unoccupiedWidth = this.width;
  }

  lastAdded() {
    return this.elements[this.length-1];
  }

  find(nm) {
    let theOne = null;
    let found = false;
    for (let i=0; ((i<this.length) && (!found)); i++) {
      found = (nm === this.elements[i].name);
      if (found) theOne = this.elements[i];
    }
    return theOne;
  }

  addElement(E) {
    if (this.length < this.elements.length) {
      this.length++;
      this.elements[this.length-1] = E;
      return E;
    } else {
      return null;
    }
  }

  // to add an element to the toolbar, use one of the following: arguments match the constructors for
  // each class, but replace the position rectangle with "left" or "right."
  addTextButton(name0, alignmt, neutral, actv) {
    return this.addElement(new TextButton(name0, this.nextPosition(alignmt,this.height), neutral, actv));
  }

  addSlider(name0, alignmt, neutral, actv, minVal, maxVal) {
    const ht = this.height/3;
    const wd = 10*ht;
    const rect = this.nextPosition(alignmt,wd);
    rect[1] += (rect[3]-ht)/2;
    rect[3] = ht;
    const S = new Slider(name0, rect, neutral, actv, minVal, maxVal);
    this.addElement(S);
    this.lastSliderAdded = S;
    textSize(S.nameTextSize);
    const nameWidth = textWidth(S.name+" ");
    const valWidth = max(textWidth(S.val2string(S.pos2val(0))+" "), textWidth(S.val2string(S.pos2val(1))+" "));
    if (alignmt === "left" || alignmt === "LEFT") {
      S.x0 += nameWidth;
      this.unoccupiedX0 += (nameWidth + valWidth);
      this.unoccupiedWidth -= (nameWidth + valWidth);
    } else if (alignmt === "right" || alignmt === "RIGHT") {
      S.x0 -= valWidth;
      this.unoccupiedWidth -= (nameWidth + valWidth);
    }
    return S;
  }

  unoccupied() {
    return [this.unoccupiedX0, this.y0, this.unoccupiedWidth, this.height];
  }

  nextPosition(alignmt, dx) {
    let dxtot = dx;
    let r;
    if (alignmt === "left" || alignmt === "LEFT") { // in the main toolbar, aligned left
      if (this.unoccupiedX0 > this.x0) {dxtot += this.spacing;} // add spacer unless all the way at the left
      this.unoccupiedX0 += dxtot;
      this.unoccupiedWidth -= dxtot;
      r = [this.unoccupiedX0 - dx, this.y0, dx, this.height];
    } else if (alignmt === "right" || alignmt === "RIGHT") { // in the main toolbar, aligned right
      if (this.unoccupiedX0+this.unoccupiedWidth < this.x0+this.width) {dxtot += this.spacing;} // add spacer unless all the way at the right
      this.unoccupiedWidth -= dxtot;
      r = [this.unoccupiedX0 + this.unoccupiedWidth, this.y0, dx, this.height];
    } else if (alignmt === "below" || alignmt === "BELOW") { // directly below the last element defined
      // note: when the last element is a slider, the line below returns 0
      const last = this.elements[this.length-1];
      let xx = last.x0;
      let yy = last.y0 + last.height + this.spacing;
      if (last instanceof Slider) {
        xx = this.lastSliderAdded.x0;
        yy = this.lastSliderAdded.y0+1.5*this.lastSliderAdded.height;
      }
      r = [xx, yy, dx, this.height];
    } else {
      r = [0,0,0,0];
    }
    return r;
  }

  update() {
    let result = false;
    if (!this.hidden) {
      for (let i=0; i<this.length; i++) {
        const updated = this.elements[i].update();
        if (updated) {
          this.lastUpdated = this.elements[i];
          result = true;
        }
      }
    }
    return result;
  }

  offerMousePress() {
    let captured = false;
    for (let i=this.length-1; ((i>=0) && (!captured)); i=i-1) {
      captured = this.elements[i].offerMousePress();
    }
    return captured;
  }

}
