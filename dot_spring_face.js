// Drawing methods take an optional target g: the main canvas by default (p5 global-mode
// functions live on window), or a p5.Graphics, e.g. the SVG buffer used for export.

class Dot {

  x; y;
  u = 0; v = 0; ax = 0; ay = 0;
  radius;
  dormant = false;
  mobile = true;
  mouselocked = false;
  active = false;
  nlinks = 0;
  parentFaces = [];
  label = null;


  constructor(x0, y0, rad) {
    this.x = x0;
    this.y = y0;
    this.radius = rad;
  }

  over() {
    return (sq(mx()-x2scr(this.x))+sq(my()-y2scr(this.y))) <= sq(this.radius);
  }

  update(dt) {
    if (!this.dormant) {
      // note: locks on whenever the button is down over the dot, even if the press started
      // elsewhere. Intentional: sweeping across dots picks them all up.
      if ((mouseIsPressed) && (this.over())) {
        this.mouselocked = true;
      }
      if (!mouseIsPressed) this.mouselocked = false;
      this.move(dt);
    }
  }

  // modifier = Ctrl/Cmd held when the button was released
  onmouserelease(modifier) {
    if (this.over()) {
      if (modifier) {
        this.mobile = !this.mobile;
      } else {
        this.active = !this.active;
      }
    }
  }

  move(dt) {
    if (this.mouselocked) {
      this.x = scr2x(mx());
      this.y = scr2y(my());
      this.u = 0;
      this.v = 0;
    } else if (this.mobile) {
      this.u = this.u + this.ax*dt;
      this.v = this.v + this.ay*dt;
      this.x = this.x + this.u*dt;
      this.y = this.y + this.v*dt;
    }
  }


  draw(g = window) {
    if (!this.dormant) {
      if (this.mouselocked) {
        g.fill(111,111,111,180);
      } else if (!this.mobile) {
        g.fill(150,0,0,180);
      } else if (this.active) {
        g.fill(0,0,0,180);
      } else {
        g.fill(0,0,0,18);
      }
      g.noStroke();
      // note: ellipse() takes a diameter, so the dot is drawn at half the size of its
      // clickable area (over() tests against radius). Intentional: the selection ring
      // below (1.7*radius diameter) roughly marks the full hit area.
      g.ellipse(x2scr(this.x),y2scr(this.y),this.radius,this.radius);
      if (this.label!=null) {
        g.fill(0,0,0,100);
        g.text(this.label,x2scr(this.x)+this.radius,y2scr(this.y));
      }
      if (this.active) {
        if (this.mobile) {
          g.stroke(0,0,0,180);
        } else {
          g.stroke(125,0,0,180);
        }
        g.noFill();
        g.strokeWeight(0.5);
        g.ellipse(x2scr(this.x),y2scr(this.y),1.7*this.radius,1.7*this.radius);
      }
    }
  }

}


// -------------------------------------------------------------------------------------------



class Spring {

  from; to;
  eqlength;
  kpull;
  dormant = false;


  constructor(fromdot, todot, k) {
    this.from = fromdot;
    this.to = todot;
    fromdot.nlinks++;
    todot.nlinks++;
    this.eqlength = sqrt(sq(todot.x-fromdot.x)+sq(todot.y-fromdot.y)); // start the spring at equilibrium
    this.kpull = k;
  }

  update() {
    if (this.from==this.to) this.dormant = true;
    if (!this.dormant) {
      const from = this.from, to = this.to;
      const len = sqrt(sq(to.x-from.x)+sq(to.y-from.y));
      const dl = len - this.eqlength;
      let F = 0;
      if (dl > 0) { // spring stretched
        F = -dl * this.kpull;
      } else { // spring compressed: do nothing
      }
      if (F != 0) {
        const theta = atan2(to.y-from.y,to.x-from.x);
        if (abs(theta)<=TWO_PI) {
          const dax = F*cos(theta);
          const day = F*sin(theta);
          to.ax = to.ax + dax; // note: assuming all dots have a mass of 1
          to.ay = to.ay + day;
          from.ax = from.ax - dax;
          from.ay = from.ay - day;
        }
      }
      if (len > 5 * this.eqlength) this.dormant = true; // if stretched too far, apply the force this time but then break
      if (len==0) this.dormant = true; // if reduced to length 0, deactivate
    }
  }

  draw(g = window) {
    if (!this.dormant) {
      g.stroke(0,0,0,36);
      g.strokeWeight(1);
      g.line(x2scr(this.from.x), y2scr(this.from.y), x2scr(this.to.x), y2scr(this.to.y));
    }
  }

}


// -------------------------------------------------------------------------------------------


class Face {
  normalcolor;
  vertices;
  dormant = false;

  constructor(v, col) {
    this.vertices = v;
    this.normalcolor = col;
    for (let i=0; i<v.length; i++) {
      v[i].parentFaces.push(this);
    }
  }

  contains(d) {
    let f = false;
    for (let i=0; i<this.vertices.length; i++) if (this.vertices[i]==d) f = true;
    return f;
  }

  draw(g = window) {
    if (!this.dormant) {
      g.fill(this.normalcolor);
      g.noStroke();
      g.beginShape();
      for (let i=0; i<this.vertices.length; i++) {
        g.vertex(x2scr(this.vertices[i].x),y2scr(this.vertices[i].y));
      }
      g.endShape(CLOSE);
    }
  }
}
