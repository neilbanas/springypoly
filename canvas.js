// "Canvas" in the original; renamed so it can't be confused with the HTML canvas or p5's.

class SketchCanvas {

  S;
  next;
  tools = null;

  // GUI parameters
  showGUI = true;
  basecolor;
  nextshapeN = 7;

  constructor() {
    this.S = new Network();
  }


  makeGuiControls() {
    const pos = [15,10,LOGICAL-20,30];
    const gray1 = lerpColor(bkgndColor,color(0),0.1);
    const gray2 = lerpColor(gray1,color(0),0.25);
    const gray3 = lerpColor(gray2,color(0),0.25);
    const tools = new Toolbar(pos, 10);
    this.tools = tools;

    tools.addSlider("charge", "left", gray2, gray3, 0.01, 10);
    tools.lastAdded().logScale = true;
    tools.lastAdded().setVal(1.0);
    tools.lastAdded().backgroundColor = gray1;
    tools.addSlider("damping", "below", gray2, gray3, 0.01, 10);
    tools.lastAdded().logScale = true;
    tools.lastAdded().setVal(1.0);
    tools.lastAdded().backgroundColor = gray1;
    tools.addSlider("size", "left", gray2, gray3, 0.5, 2);
    tools.lastAdded().setVal(1.0);
    tools.lastAdded().quantize(0.1);
    tools.lastAdded().backgroundColor = gray1;
    tools.addSlider("color","below", gray2, gray3, 0, colors.length-1);
    tools.lastAdded().quantize(1);
    tools.lastAdded().showVal = false;
    tools.lastAdded().setPos(0);
    tools.addSlider("sides","below", gray2, gray3, 3, 12);
    tools.lastAdded().quantize(1);
    tools.lastAdded().setVal(7);
    tools.lastAdded().backgroundColor = gray1;
  }


  update() {
    if ((this.showGUI) && (this.tools==null)) {
      this.makeGuiControls();
    }
    const S = this.S, tools = this.tools;
    if (this.showGUI) {
      tools.update();
      S.charge = S.scaleCharge * tools.find("charge").getVal();
      S.beta = tools.find("damping").getVal();
      S.baseDist = S.scaleDist * tools.find("size").getVal();
      this.nextshapeN = round(tools.find("sides").getVal());
      this.next = this.nextshapeindicator(this.nextshapeN);
      let c = colors[round(tools.find("color").getVal())];
      this.basecolor = color(red(c),green(c),blue(c),180);
      if (this.next.nfaces>0) this.next.faces[0].normalcolor = this.basecolor;
      tools.find("color").backgroundColor = this.basecolor;
      this.next.update();
      this.next.draw();
    }
    S.update();
    S.draw();
  }


  onMousePress() {
    if (this.showGUI && this.tools) {
      const captured = this.tools.offerMousePress();
      if ((!captured) && (!this.S.over())) {
        this.S.addPolygon(scr2x(mx()), scr2y(my()), this.nextshapeN, this.basecolor);
      }
    }
  }

  onMouseRelease(modifier) {
    this.S.onmouserelease(modifier);
  }

  // returns false when the key's default browser action should be suppressed
  onKeyPress() {
    if (key=='s') {
      this.saveImage();
    } else if ((keyCode==DELETE) || (keyCode==BACKSPACE)) {
      this.S.deleteSelection();
      return false;
    } else if (key=='c') {
      this.S.clearSelection();
    } else if (key=='g') {
      this.showGUI = !this.showGUI;
    }
    // ('e', save every frame, is dropped in the port to p5.js)
  }

  // Vector export: redraw the network (no GUI) into an offscreen SVG buffer at the logical
  // 800x800 size and download it, named by frame number like the original PDFs.
  saveImage() {
    const pg = createGraphics(LOGICAL, LOGICAL, SVG);
    pg.textFont(FONT);
    pg.background(bkgndColor);
    this.S.draw(pg);
    const svgText = new XMLSerializer().serializeToString(pg._renderer.svg);
    pg.remove();
 
    const url = URL.createObjectURL(new Blob([svgText], {type: "image/svg+xml"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = "springypoly-" + nf(frameCount, 5) + ".svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);  // let the download start first
  }


  // rebuilt every frame, as in the original (it's cheap now that arrays aren't preallocated);
  // keeping it between frames would let its one-polygon physics evolve
  nextshapeindicator(N) {
    const pos = this.tools.unoccupied();
    const nsi = new Network();
    nsi.baseDist = 0.1/N;
    nsi.addPolygon(scr2x(pos[0])+0.05, 0.935, N, this.basecolor);
    return nsi;
  }

}
