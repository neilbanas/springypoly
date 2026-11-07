
// Port note: the original preallocated 100,000-slot arrays (plus vacancy flags) and rebuilt
// them in consolidate(). Here the arrays grow as needed but keep the same slot/vacancy
// scheme, so indices are reused exactly as before; maxdots is still the capacity limit.

class Network {

  maxdots = 100000; maxsprings = 100000; maxfaces = 100000;
  ndots = 0; nsprings = 0; nfaces = 0;
  dots = []; springs = []; faces = [];
  dotvacant = []; springvacant = []; facevacant = [];

  scaleDist = 0.012; // this shouldn't change if baseDist changes through user interaction
  scaleCharge = 0.045; // likewise
  beta = 1;
  timestep = 0.05;
  kpull = 100;

  labelDots = false;
  baseDist; charge; dotSize;

  consolidateInterval = 1000; // in ms
  lastConsolidated;

  dotdist2 = new Float64Array(0);  // ndots x ndots squared distances, reused between frames

  constructor() {
    this.baseDist = this.scaleDist;
    this.dotSize = x2scr(this.baseDist/sqrt(2));
    this.lastConsolidated = millis();
  }

  // first vacant slot below n, or n itself (= append) if there are none
  static firstVacancy(vacant, n) {
    let i = 0;
    while ((i < n) && (!vacant[i])) i++;
    return i;
  }

  addDot(x0, y0) {
    const i = Network.firstVacancy(this.dotvacant, this.ndots);
    if (i<this.maxdots) {
      this.dotvacant[i] = false;
      if (i>this.ndots-1) this.ndots = i+1;
      this.dots[i] = new Dot(x0,y0,this.dotSize);
      if (this.labelDots) this.dots[i].label = str(i);
      return i;
    } else {
      return -1;
    }
  }

  addSpring(fromi, toi, kpull) {
    if ((fromi>-1) && (toi>-1)) {
      const i = Network.firstVacancy(this.springvacant, this.nsprings);
      if (i<this.maxsprings) {
        this.springvacant[i] = false;
        if (i>this.nsprings-1) {this.nsprings = i+1;}
        this.springs[i] = new Spring(this.dots[fromi],this.dots[toi],kpull);
        return i;
      } else {
        return -1;
      }
    } else {
      return -1;
    }
  }

  addFace(v, col) {
    const i = Network.firstVacancy(this.facevacant, this.nfaces);
    if (i<this.maxfaces) {
      this.facevacant[i] = false;
      if (i>this.nfaces-1) {this.nfaces = i+1;}
      this.faces[i] = new Face(v,col);
      return i;
    } else {
      return -1;
    }
  }

  removeDot(i) {
    this.dotvacant[i] = true;
    this.dots[i].dormant = true;
    for (let j=0; j<this.nsprings; j++) {
      if ((this.springs[j].from==this.dots[i]) || (this.springs[j].to==this.dots[i])) {
        this.removeSpring(j);
      }
    }
    for (let j=0; j<this.nfaces; j++) {
      if (this.faces[j].contains(this.dots[i])) this.removeFace(j);
    }
  }

  removeSpring(i) {
    if (!this.springs[i].dormant) {
      this.springvacant[i] = true;
      this.springs[i].dormant = true;
      if (!this.springs[i].from.dormant) this.springs[i].from.nlinks -= 1;
      if (!this.springs[i].to.dormant) this.springs[i].to.nlinks -= 1;
    }
  }

  removeFace(i) {
    this.facevacant[i] = true;
    this.faces[i].dormant = true;
    for (let k=0; k<this.faces[i].vertices.length; k++) {
      // like Java's ArrayList.remove(Object): removes the first occurrence only
      const pf = this.faces[i].vertices[k].parentFaces;
      const idx = pf.indexOf(this.faces[i]);
      if (idx > -1) pf.splice(idx, 1);
    }
  }


  addPolygon(x0, y0, N, col) {
    if (((this.ndots+N >= this.maxdots) || (this.nsprings+N >= this.maxsprings)) || (this.nfaces == this.maxfaces)) return false;
    const n = new Array(N);
    const dtheta = TWO_PI/N;
    const rad = 2 * this.baseDist/sqrt(2*(1-cos(TWO_PI/N)));
    n[0] = this.addDot(x0+rad,y0);
    for (let i=1; i<N; i++) {
      n[i] = this.addDot(x0+rad*cos(i*dtheta),y0+rad*sin(i*dtheta));
      this.addSpring(n[i-1],n[i],this.kpull);
    }
    this.addSpring(n[N-1],n[0],this.kpull);
    const v = new Array(N);
    for (let i=0; i<N; i++) v[i] = this.dots[n[i]];
    this.addFace(v,col);
    return true;
  }


  over() {
    let f = false;
    for (let i=0; i<this.ndots; i++) {
      if ((!this.dots[i].dormant) && (this.dots[i].over())) f = true;
    }
    return f;
  }


  mergedots(i, j) {
    const dots = this.dots;
    // make springs that go to j go to i
    for (let k=0; k<this.nsprings; k++) {
      if (this.springs[k].from == dots[j]) this.springs[k].from = dots[i];
      if (this.springs[k].to == dots[j]) this.springs[k].to = dots[i];
    }
    dots[i].nlinks = dots[i].nlinks + dots[j].nlinks;
    // replace j with i in faces
    for (let k=0; k<this.nfaces; k++) {
      for (let m=0; m<this.faces[k].vertices.length; m++) {
        if (this.faces[k].vertices[m]==dots[j]) {
          this.faces[k].vertices[m] = dots[i];
        }
      }
    }
    // combine lists of parentFaces
    for (let k=0; k<dots[j].parentFaces.length; k++) {
      dots[i].parentFaces.push(dots[j].parentFaces[k]);
    }
    // move i to the average position, charge, and color of i and j
    dots[i].x = (dots[i].x + dots[j].x)/2;
    dots[i].y = (dots[i].y + dots[j].y)/2;
    // active & mobile tags
    dots[i].active = (dots[i].active || dots[j].active);
    dots[i].mobile = (dots[i].mobile && dots[j].mobile);
    dots[i].mouselocked = (dots[i].mouselocked || dots[j].mouselocked);
    // deactivate j
    this.removeDot(j);
  }

  mergesprings(i, j) {
    this.removeSpring(j);
  }

  consolidate() {
    // eliminate faces that are less than 3 points long
    for (let k=0; k<this.nfaces; k++) {
       if (this.faces[k].vertices.length < 3) this.removeFace(k);
    }
    // remove springs that go to and from the same dot
    for (let i=0; i<this.nsprings; i++) {
      if (this.springs[i].from==this.springs[i].to) this.removeSpring(i);
    }
    // port addition: free the slots of springs that have broken (gone dormant without being
    // removed), so they're dropped below instead of being kept forever. Note that while they
    // survive (< consolidateInterval), a broken spring can still take part in the duplicate-
    // spring merge in update(), as in the original.
    for (let i=0; i<this.nsprings; i++) {
      if (this.springs[i].dormant) this.springvacant[i] = true;
    }
    // deactivate dots not connected to any springs
    for (let i=0; i<this.ndots; i++) this.dots[i].nlinks = 0;
    for (let i=0; i<this.nsprings; i++) {
      if (!this.springs[i].dormant) {
        this.springs[i].from.nlinks++;
        this.springs[i].to.nlinks++;
      }
    }
    // collapse vacancies in the dot, spring, and face arrays
    this.dots = this.dots.slice(0, this.ndots).filter((d, i) => !this.dotvacant[i]);
    this.ndots = this.dots.length;
    this.dotvacant = new Array(this.ndots).fill(false);
    if (this.labelDots) for (let i=0; i<this.ndots; i++) this.dots[i].label = str(i);

    this.springs = this.springs.slice(0, this.nsprings).filter((s, i) => !this.springvacant[i]);
    this.nsprings = this.springs.length;
    this.springvacant = new Array(this.nsprings).fill(false);

    this.faces = this.faces.slice(0, this.nfaces).filter((f, i) => !this.facevacant[i]);
    this.nfaces = this.faces.length;
    this.facevacant = new Array(this.nfaces).fill(false);
  }


  onmouserelease(modifier) {
    for (let i=0; i<this.ndots; i++) {
      this.dots[i].onmouserelease(modifier);
    }
  }

  deleteSelection() {
    for (let i=0; i<this.ndots; i++) {
      if (this.dots[i].active) this.removeDot(i);
    }
  }

  clearSelection() {
    for (let i=0; i<this.ndots; i++) {
      if (this.dots[i].active) this.dots[i].active = false;
    }
  }

  update() {
    if (this.ndots == 0) return;
    if (millis() > this.lastConsolidated + this.consolidateInterval) {
      this.lastConsolidated = millis();
      this.consolidate();
    }
    const dots = this.dots, springs = this.springs;
    const ndots = this.ndots, nsprings = this.nsprings;
    // congeal springs with matching from & to
    for (let i=0; i<nsprings; i++) {
      for (let j=i+1; j<nsprings; j++) {
        if (((springs[i].to==springs[j].to) && (springs[i].from==springs[j].from)) || ((springs[i].to==springs[j].from) && (springs[i].from==springs[j].to))) {
          this.mergesprings(i,j);
        }
      }
    }
    // calc distances (flat ndots x ndots array; zeroed each frame like Java's new float[][])
    if (this.dotdist2.length !== ndots*ndots) {
      this.dotdist2 = new Float64Array(ndots*ndots);
    } else {
      this.dotdist2.fill(0);
    }
    const dotdist2 = this.dotdist2;
    for (let i=0; i<ndots; i++) {
      if (!dots[i].dormant) {
        for (let j=i+1; j<ndots; j++) {
          if (!dots[j].dormant) dotdist2[i*ndots+j] = sq(dots[j].x-dots[i].x)+sq(dots[j].y-dots[i].y);
        }
      }
    }
    // congeal dots closer than scaleDist/sqrt(2)
    const congealDist2 = 0.5 * sq(this.scaleDist);
    for (let i=0; i<ndots; i++) {
      if (!dots[i].dormant) {
        for (let j=i+1; j<ndots; j++) {
          if (!dots[j].dormant) if (dotdist2[i*ndots+j] < congealDist2) this.mergedots(i,j);
        }
      }
    }
    // initialize accelerations, add damping
    for (let i=0; i<ndots; i++) {
      if (!dots[i].dormant) {
        dots[i].ax = -this.beta*dots[i].u*max(abs(dots[i].u),1);
        dots[i].ay = -this.beta*dots[i].v*max(abs(dots[i].v),1);
      }
    }
    // calc "charge" forces: friends strongly repel, non-friends attract (this is a inconsistent metaphor.)
    let F, theta, dax, day;
    const sqScale = sq(this.scaleDist);
    for (let i=0; i<ndots; i++) {
      for (let j=i+1; j<ndots; j++) {
        const scaledDist2 = dotdist2[i*ndots+j] / sqScale;
        if (((!dots[i].dormant) && (!dots[j].dormant))) {
          if (this.friends(i,j)) {
            F = 1./scaledDist2;
          } else if (scaledDist2 > 1) {
            F = - this.charge * pow(scaledDist2,-1.25);
          } else {
            F = - this.charge * pow(scaledDist2,-1.5);
          }
          theta = atan2(dots[j].y-dots[i].y,dots[j].x-dots[i].x);
          if (abs(theta)<=TWO_PI) {
            dax = F*cos(theta);
            day = F*sin(theta);
          } else {
            dax = 0;
            day = 0;
          }
          dots[j].ax += dax; // note: assuming all dots have a mass of 1
          dots[j].ay += day;
          dots[i].ax -= dax;
          dots[i].ay -= day;
        }
      }
    }

    for (let i=0; i<nsprings; i++) springs[i].update();
    for (let i=0; i<ndots; i++) dots[i].update(this.timestep);
  }


  friends(i, j) {
    let r = false;
    const pf = this.dots[i].parentFaces;
    for (let k=0; k<pf.length && !r; k++) {
      r = pf[k].contains(this.dots[j]);
    }
    return r;
  }


  draw(g = window) {
    for (let i=0; i<this.nfaces; i++) this.faces[i].draw(g);
    for (let i=0; i<this.nsprings; i++) this.springs[i].draw(g);
    for (let i=0; i<this.ndots; i++) this.dots[i].draw(g);
  }


}
