// springypoly — p5.js port of springypoly33 (Processing), itself a simplification of v3.2.
//
// Everything is drawn in a fixed LOGICAL x LOGICAL coordinate system (the original 800x800),
// then scaled uniformly to fit the largest square that fits the window. All pixel constants
// (toolbar layout, dot sizes, text sizes) are therefore unchanged from the original.
// Mouse/touch positions must go through mx(), my() to get logical coordinates.

const LOGICAL = 800;      // logical canvas size: the original size(800,800)
let viewScale = 1;        // screen pixels per logical pixel

let bkgndColor, bluecolor, yellowcolor, greencolor, ltgreencolor, orangecolor;
let colors = [];

// "Frutiger-Roman-48.vlw" in the original. A .vlw font can't be used in a browser (and
// Frutiger is commercial), so use Frutiger if it's installed locally, otherwise a near match.
// No spaces allowed: p5 1.x quotes any font name containing whitespace, which would turn
// this whole list into a single (nonexistent) family name.
const FONT = "Frutiger,Helvetica,Arial,sans-serif";

let app;  // the Canvas object ("canvas" in the original; renamed to avoid clashing with p5/DOM names)

function setup() {
  // colours are created here, not at top level: p5 functions don't exist until setup()
  bkgndColor = color(255);
  bluecolor = color(125,191,215);
  yellowcolor = color(242,222,96);
  greencolor = color(136,200,112);
  ltgreencolor = color(216,228,123);
  orangecolor = color(244,181,123);

  const s = fitSize();
  const cnv = createCanvas(s, s);
  cnv.parent(document.querySelector("main"));
  // stop right-click / Mac Ctrl-click from opening the context menu over the sketch
  cnv.elt.addEventListener("contextmenu", (e) => e.preventDefault());
  viewScale = s / LOGICAL;

  textFont(FONT);
  frameRate(30);
  app = new SketchCanvas();
  colors[0] = bluecolor;
  colors[1] = greencolor;
  colors[2] = ltgreencolor;
  colors[3] = yellowcolor;
  colors[4] = orangecolor;
}


function draw() {
  background(bkgndColor);
  push();
  scale(viewScale);
  app.update();
  pop();
}

function mousePressed() {
  app.onMousePress();
}

function mouseReleased(event) {
  app.onMouseRelease(modifierHeld(event));
}

// Touch: p5 1.x doesn't route touches to the mouse handlers when these are defined, but it does
// keep mouseX/mouseY/mouseIsPressed up to date, so a one-finger drag behaves like a mouse drag.
// Returning false stops the browser scrolling/zooming and synthesising extra mouse events.
function touchStarted() {
  app.onMousePress();
  return false;
}

function touchEnded() {
  app.onMouseRelease(false);
  return false;
}

function touchMoved() {
  return false;
}

function keyPressed(event) {
  if (event && (event.ctrlKey || event.metaKey)) return;  // leave browser shortcuts (Cmd-S etc.) alone
  return app.onKeyPress();
}

function windowResized() {
  const s = fitSize();
  resizeCanvas(s, s);
  viewScale = s / LOGICAL;
}

function fitSize() {
  return Math.max(1, Math.floor(Math.min(windowWidth, windowHeight)));
}

// Ctrl (or Cmd on a Mac) held during a click toggles whether a dot is pinned.
// Replaces Processing's keyCode==CONTROL / keyCode==157 test; reading the modifier from the
// mouse event itself avoids "stuck" keys when the window loses focus.
function modifierHeld(event) {
  return !!(event && (event.ctrlKey || event.metaKey));
}

// mouse position in logical coordinates
function mx() {return mouseX / viewScale;}
function my() {return mouseY / viewScale;}


// world coordinates (unit square, y up) <-> logical screen coordinates (y down)
let canvasSize = 1;  // world size, not pixels
function x2scr(x) {return (LOGICAL * x/canvasSize);}
function y2scr(y) {return LOGICAL * (1-y/canvasSize);}
function scr2x(sx) {return sx/LOGICAL*canvasSize;}
function scr2y(sy) {return (1-sy/LOGICAL)*canvasSize;}
