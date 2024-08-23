if(localStorage.highscore === undefined) localStorage.highscore = 0;

var gameStarted = false, gameOver = false;

var canvas_background = document.getElementById("background");
var canvas_enviroment = document.getElementById("enviroment");
var setWidth = 500;
var setHeight = 500;
canvas_background.width = setWidth;
canvas_enviroment.width = setWidth;
canvas_background.height = setHeight;
canvas_enviroment.height = setHeight;
var cb = canvas_background.getContext("2d");
var ce = canvas_enviroment.getContext("2d");

// Initialize joystick
const joystick = nipplejs.create({
    zone: document.getElementById('joystick'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'red'
});

// On-screen button controls
document.getElementById('left').addEventListener('touchstart', handleLeftMove);
document.getElementById('right').addEventListener('touchstart', handleRightMove);
document.getElementById('jump').addEventListener('touchstart', handleShoot);

document.getElementById('left').addEventListener('mousedown', handleLeftMove);
document.getElementById('right').addEventListener('mousedown', handleRightMove);
document.getElementById('jump').addEventListener('mousedown', handleShoot);

function handleLeftMove() {
    console.log('Move Left');
}

function handleRightMove() {
    console.log('Move Right');
    // Handle right movement
}

function handleShoot() {
    console.log('Shoot');
    // Handle shoot action
}

// Handle touch events
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

joystick.on('move', (evt, data) => {
    console.log('Joystick move:', data);
});

let xDown = null;
let yDown = null;

function handleTouchStart(evt) {
    const firstTouch = evt.touches[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
}

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;

    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
            console.log('Swipe Left');
            // Handle swipe left
        } else {
            console.log('Swipe Right');
            // Handle swipe right
        }
    } else {
        if (yDiff > 0) {
            console.log('Swipe Up');
            // Handle swipe up
        } else {
            console.log('Swipe Down');
            // Handle swipe down
        }
    }
    xDown = null;
    yDown = null;
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}
var mousePos = { x: 0, y: 0 };
canvas_enviroment.addEventListener(
  "mousemove",
  function(evt) {
    mousePos = getMousePos(canvas_enviroment, evt);
  },
  false
);

var maxBorders = { width: 15, height: 15 }; //For bitmap
var pixelAmount = {
  width: setWidth > 500 ? setWidth : 500,
  height: setHeight > 500 ? setHeight : 500
}; //For determining how many pixels can be used
var cellSize = {
  w: pixelAmount.width / maxBorders.width,
  h: pixelAmount.height / maxBorders.height
}; //w=width, h=height. Size for width and height of each cell in the bitmap

var goingRight = false;
var goingLeft = false;
var goingUp = false;
var goingDown = false;

var maxEnemies = 1;

var world_objects = [
  [], //All 'background' collide-able objects. Such as stones and the border ~~ Code name: bg
  [], //All AI ~~ code name: ai
  [] //Projectiles ~~ Code name: p
];

var bullet_timers = [];

function blockType(x, y, collision, color) {
  this.originals = { x: x, y: y };
  this.x = x * cellSize.w;
  this.y = y * cellSize.h;
  this.collision = collision; // A boolean. Determines whether it should be collide-able or not
  this.color = color;
}

function Bullet(vector, start, fromEnemy, color, dmg) {
  this.vector = vector; //Object, x and y vectors that represent the direction
  this.position = start; //Object, x & y
  this.fromEnemy = fromEnemy;
  this.color = color;
  this.dmg = dmg;
  this.speed = (dmg > 10 ? 1/dmg: 1/10); //Ratio to amount of damage the bullet does. More dmg=Slower speed
  this.size = (dmg > 10 ? dmg/200: 10/200); //Ratio to amount of damage the bullet does. More dmg=Bigger size
}

function AI(hp, dmg, color, x, y) {
  this.maxHP = hp;
  this.hp = hp;
  this.dmg = dmg;
  this.color = color;
  this.w = 1;
  this.h = 1;
  this.x = x;
  this.y = y;
  this.stalledShot = (Math.random() * 1000) + 1000;
}

var player = {
  name: undefined,
  color: "#00394d",
  dmg: 4,
  dmgIncrease: 0.04,
  dmgConstant: 2,
  speed: 0.01, //In percentage to size of cell. It will always move 1% of cell size (unless upgraded) every millisecond
  hp: 100,
  maxHP: 100,
  x: pixelAmount.width / 2,
  y: pixelAmount.height / 2,
  w: 0.75, //In percentage to the actual size of a cell
  h: 0.75, //In percentage to the actual size of a cell
  nx: 0, //Normalized vector of x, represents where its aiming horizontally
  ny: 0, //Normalized vector of y, represents where its aiming vertically
  nxModified: 0, //Takes the line out slightly further, to be able to spawn in bullets
  nyModified: 0, //Takes the line out slightly further, to be able to spawn in bullets
  killed: 0,
  toKill: 10 //Enemies left to kill until the player gets a health boost
};
world_objects[1].push(player);

var bitmap = [];
function reset_bitmap(rows, columns) {
  for (var i = 0; i < rows; i++) {
    bitmap.push([]);
    for (var j = 0; j < columns; j++) {
      bitmap[i].push(0);
    }
  }
}
reset_bitmap(maxBorders.width, maxBorders.height);

function fill_bitmap() {
  world_objects[0] = [];
  for (var i = 0; i < maxBorders.width; i++) {
    for (var j = 0; j < maxBorders.height; j++) {
      if (
        i === 0 ||
        i === maxBorders.width - 1 ||
        j === 0 ||
        j === maxBorders.height - 1
      ) {
        bitmap[i][j] = new blockType(i, j, true, "#8B4513");
        world_objects[0].push(bitmap[i][j]);
        continue;
      }
      var random_number = Math.random();
      if (random_number <= 0.05) {
        bitmap[i][j] = new blockType(i, j, true, "gray");
        world_objects[0].push(bitmap[i][j]);
      } else bitmap[i][j] = new blockType(i, j, false, "green");
    }
  }
  draw_bitmap();
}
fill_bitmap();

function draw_bitmap() {
  for (var i = 0; i < maxBorders.width; i++) {
    for (var j = 0; j < maxBorders.height; j++) {
      cb.fillStyle = bitmap[i][j].color;
      cb.fillRect(bitmap[i][j].x, bitmap[i][j].y, cellSize.w, cellSize.h);
    }
  }
}

var pressed = [];

$(document).keydown(function(e) {
  if (
    (e.which == "65" ||
      e.which == "83" ||
      e.which == "68" ||
      e.which == "87") &&
    pressed.indexOf(e.which) === -1
  )
    pressed.push(e.which);
  // 65:a,83:s,68:d,87:w
});
$(document).keyup(function(e) {
  if (
    e.which == "65" ||
    e.which == "83" ||
    e.which == "68" ||
    e.which == "87"
  ) {
    var location = pressed.indexOf(e.which);
    pressed.splice(location, 1);
  }
  // 65:a,83:s,68:d,87:w
});

function startGame() {
  var difficulty = document.getElementById("difficulty").value;
  if(difficulty === "easy") {
    maxEnemies = 1;
  } else if (difficulty === "normal"){
    maxEnemies = 3;
    player.dmgConstant = 5;
    player.dmgIncrease = 0.065;
  } else {
    maxEnemies = 5;
    player.dmgConstant = 6;
    player.dmgIncrease = 0.09;
  }
  document.getElementById("startMenu").style.display = "none";
  gameStarted = true;
}

setInterval(function() {
  ce.clearRect(0, 0, canvas_enviroment.width, canvas_enviroment.height);
  if(gameStarted && gameOver === false) {
    if(player.dmg < 50) player.dmg+=player.dmgIncrease;
    var speedX = cellSize.w * player.speed;
    var speedY = cellSize.h * player.speed;
  
    if (pressed.length > 0) {
    if (pressed.indexOf(65) !== -1) {
      player.x -= speedX;
      goingLeft = true;
    } else goingLeft = false;
    if (pressed.indexOf(83) !== -1) {
      player.y += speedY;
      goingDown = true;
    } else goingDown = false;
    if (pressed.indexOf(68) !== -1) {
      player.x += speedX;
      goingRight = true;
    } else goingRight = false;
    if (pressed.indexOf(87) !== -1) {
      player.y -= speedY;
      goingUp = true;
    } else goingUp = false;
  } 
    
    for(var i = 0; i < world_objects[1].length; i++) {
    ce.fillStyle = world_objects[1][i].color;
    ce.fillRect(world_objects[1][i].x, world_objects[1][i].y, world_objects[1][i].w*cellSize.w, world_objects[1][i].w*cellSize.w);
    ce.beginPath();
    ce.lineWidth="1";
    ce.strokeStyle="black";
    ce.rect(world_objects[1][i].x, world_objects[1][i].y, world_objects[1][i].w*cellSize.w, world_objects[1][i].w*cellSize.w); 
    ce.stroke();
  } //Draws all the AI
    
    if(world_objects[1].length < maxEnemies+1) {
    createAI();
    resetBulletTimers();
  }
      
    Collision_Detection(speedX, speedY);
    Move_Bullets();
    Draw_Lines_Player();
    Draw_Lines_AI();
    Draw_HP();
    updatePanel();
  }
  
  if(gameOver) {
    ce.font = "30px Arial";
    ce.fillStyle = "red";
    ce.fillText("Game Over!", pixelAmount.width/2, pixelAmount.height/2);
  }
}, 1);

function createAI() {
  var bitmapPositionX = Math.floor(player.x/cellSize.w);
  var bitmapPositionY = Math.floor(player.y/cellSize.h);
  
  var i = Math.floor(Math.random()*maxBorders.width);
  var j = Math.floor(Math.random()*maxBorders.width);
  
  var AI_is_here = false;
  for(var ai = 0; ai < world_objects[1].length; ai++) {
    if(Math.floor(world_objects[1][ai].x/maxBorders.w) === i && Math.floor(world_objects[1][ai].y/maxBorders.y) === j) AI_is_here = true;
  }
      
      if(bitmap[i][j].color === "green" && AI_is_here === false) {
        var hp = (Math.random() * 100)+50;
        var dmg = (Math.random()*20)+10;
        world_objects[1].push(new AI(hp, dmg, "#660000", i*cellSize.w, j*cellSize.h));
        return;
      }
}

function Collision_Detection(speedX, speedY) {
  var p, ai, bg, p1, p2;

  //Checks if the player hits a background object
    for (bg = 0; bg < world_objects[0].length; bg++) {
      /*
      ~~ Checks if top left is to the left of object's top right
      ~~ Checks if top right is to the right of the object's top left
      ~~ Checks if top left is above object's bottom left
      ~~ Checks if bottom left is below object's top left
      */
      if (
        player.x < world_objects[0][bg].x + cellSize.w &&
        player.x + player.w * cellSize.w >
          world_objects[0][bg].x &&
        player.y < world_objects[0][bg].y + cellSize.h &&
        player.y + player.h * cellSize.h >
          world_objects[0][bg].y
      ) {
        if (player.x < world_objects[0][bg].x && goingLeft === false)
          player.x -= speedX; //Checks if ai is left of object
        if (player.x > world_objects[0][bg].x + (cellSize.w - cellSize.w * 0.1) && goingRight === false)
          player.x += speedX; //Checks if ai is right of object
        if (player.y < world_objects[0][bg].y + (cellSize.h - cellSize.h * 0.1) && goingUp === false)
          player.y -= speedY; //Checks if ai is below object
        if (player.y > world_objects[0][bg].y && goingDown === false)
          player.y += speedY; //Checks if AI is above object
      }
    }

  //Checks if the player hits an AI
  for (ai = 1; ai < world_objects[1].length; ai++) {
      /*
      ~~ Checks if top left is to the left of object's top right
      ~~ Checks if top right is to the right of the object's top left
      ~~ Checks if top left is above object's bottom left
      ~~ Checks if bottom left is below object's top left
      */
      if (
        player.x < world_objects[1][ai].x + cellSize.w &&
        player.x + player.w * cellSize.w >
          world_objects[1][ai].x &&
        player.y < world_objects[1][ai].y + cellSize.h &&
        player.y + player.h * cellSize.h >
          world_objects[1][ai].y
      ) {
        if (player.x < world_objects[1][ai].x && goingLeft === false)
          player.x -= speedX; //Checks if ai is left of object
        if (player.x > world_objects[1][ai].x + (cellSize.w - cellSize.w * 0.1) && goingRight === false)
          player.x += speedX; //Checks if ai is right of object
        if (player.y < world_objects[1][ai].y + (cellSize.h - cellSize.h * 0.1) && goingUp === false)
          player.y -= speedY; //Checks if ai is below object
        if (player.y > world_objects[1][ai].y && goingDown === false)
          player.y += speedY; //Checks if AI is above object
      }
    }
  
  //Checks if a projectile hits a background object
  for (p = 0; p < world_objects[2].length; p++) {
    for (bg = 0; bg < world_objects[0].length; bg++) {
      if (
        world_objects[2][p].position.x < world_objects[0][bg].x + cellSize.w &&
        world_objects[2][p].position.x + (world_objects[2][p].size * cellSize.w) >
          world_objects[0][bg].x &&
        world_objects[2][p].position.y < world_objects[0][bg].y + cellSize.h &&
        world_objects[2][p].position.y + (world_objects[2][p].size * cellSize.h) >
          world_objects[0][bg].y
      ) {
        world_objects[2].splice(p, 1);
      }
    }
  }
  
  //Checks if a projectile hits another projectile
  for (p1 = 0; p1 < world_objects[2].length; p1++) {
    for (p2 = 0; p2 < world_objects[2].length; p2++) {
      if(p2 !== p1 && ((world_objects[2][p1].fromEnemy && world_objects[2][p2].fromEnemy === false) || (world_objects[2][p1].fromEnemy === false && world_objects[2][p2].fromEnemy))) {
      if (
          world_objects[2][p1].position.x < world_objects[2][p2].position.x + (world_objects[2][p2].size * cellSize.w) &&
         world_objects[2][p1].position.x + (world_objects[2][p1].size * cellSize.w) >
           world_objects[2][p2].position.x &&
         world_objects[2][p1].position.y < world_objects[2][p2].position.y + (world_objects[2][p2].size * cellSize.h) &&
         world_objects[2][p1].position.y + (world_objects[2][p1].size * cellSize.h) >
           world_objects[2][p2].position.y
        ) {
          var p1Dmg = world_objects[2][p1].dmg;
          var p2Dmg = world_objects[2][p2].dmg;
          world_objects[2][p2].dmg -= Math.abs(p1Dmg);
          world_objects[2][p1].dmg -= Math.abs(p2Dmg);
        
          world_objects[2][p1].speed = (world_objects[2][p1].dmg > 10 ? 1/world_objects[2][p1].dmg : 1/10);
           world_objects[2][p2].speed = (world_objects[2][p2].dmg > 10 ? 1/world_objects[2][p2].dmg : 1/10);
          world_objects[2][p1].size = (world_objects[2][p1].dmg > 10 ? world_objects[2][p1].dmg/200 : 10/200);
           world_objects[2][p2].size = world_objects[2][p2].size = (world_objects[2][p1].dmg > 10 ? world_objects[2][p2].dmg/200 : 10/200);
        
        if(world_objects[2][p2].dmg <= 0) world_objects[2].splice(p2, 1);
        if(world_objects[2][p1].dmg <= 0) world_objects[2].splice(p1, 1);
        }
      }
    }
  }

  //Checks if a projectile hits an AI
  for (p = 0; p < world_objects[2].length; p++) {
    for (ai = 0; ai < world_objects[1].length; ai++) {
        if (
          world_objects[2][p].position.x <
            world_objects[1][ai].x + cellSize.w &&
          world_objects[2][p].position.x +
            world_objects[2][p].size * cellSize.w >
            world_objects[1][ai].x &&
          world_objects[2][p].position.y <
            world_objects[1][ai].y + cellSize.h &&
          world_objects[2][p].position.y +
            world_objects[2][p].size * cellSize.h >
            world_objects[1][ai].y
        ) {
          if (ai === 0 && world_objects[2][p].fromEnemy) {
             player.hp -= world_objects[2][p].dmg;
             world_objects[2].splice(p, 1);
            if(Math.floor(player.hp)<=0) {
              gameOver = true;
              if(parseInt(localStorage.highscore) < player.killed) localStorage.highscore = player.killed;
            }
          } else if(ai !== 0 && world_objects[2][p].fromEnemy === false) { //Still needs to double check that its not considering the player object
             world_objects[1][ai].hp -= world_objects[2][p].dmg;
             world_objects[2].splice(p, 1);
            if(Math.floor(world_objects[1][ai].hp) <= 0) {
              world_objects[1].splice(ai, 1);
              player.toKill--;
              if(player.toKill <= 0) player.toKill = 10;
              player.killed++;
              if(player.killed%10===0) (player.hp<70 ? player.hp+=30:player.hp=100);
            }
          }
       }
    }
  }
}

function addBulletAI(index) {
  var centerX = world_objects[1][index].x + cellSize.w * world_objects[1][index].w / 2;
  var centerY = world_objects[1][index].y + cellSize.w * world_objects[1][index].h / 2;
  if(index === 0) {
    world_objects[2].push(new Bullet({ x: world_objects[1][index].nx, y: world_objects[1][index].ny }, { x: centerX + world_objects[1][index].nxModified, y: centerY + world_objects[1][index].nyModified }, false, "#00134d", world_objects[1][index].dmg));
    player.dmg = player.dmgConstant;
  } else 
    world_objects[2].push(new Bullet({ x: world_objects[1][index].nx, y: world_objects[1][index].ny }, { x: centerX + world_objects[1][index].nxModified, y: centerY + world_objects[1][index].nyModified }, true, "#00134d", world_objects[1][index].dmg));
}
function Move_Bullets() {
  //console.log(world_objects[2].length);
  for (var p = 0; p < world_objects[2].length; p++) {
    world_objects[2][p].position.x +=
      world_objects[2][p].vector.x * world_objects[2][p].speed;
    world_objects[2][p].position.y +=
      world_objects[2][p].vector.y * world_objects[2][p].speed;
    ce.beginPath();
    ce.arc(
      world_objects[2][p].position.x,
      world_objects[2][p].position.y,
      world_objects[2][p].size * cellSize.w,
      0,
      2 * Math.PI
    );
    ce.fillStyle = "#00134d";
    ce.fill();
    ce.stroke();
  }
}

function Draw_Lines_Player() {
    var maxLen = world_objects[1][0].w * cellSize.w / 2;
    var centerX =
      world_objects[1][0].x + cellSize.w * world_objects[1][0].w / 2;
    var centerY =
      world_objects[1][0].y + cellSize.w * world_objects[1][0].h / 2;
    var vx = mousePos.x - centerX;
    var vy = mousePos.y - centerY;
    var mag = Math.sqrt(vx * vx + vy * vy);
    var nx = vx / mag * maxLen;
    var ny = vy / mag * maxLen;
    world_objects[1][0].nx = nx;
    world_objects[1][0].ny = ny;

    var nxModified = vx / mag * (maxLen + 0.1 * cellSize.w);
    var nyModified = vy / mag * (maxLen + 0.1 * cellSize.h);
    world_objects[1][0].nxModified = nxModified;
    world_objects[1][0].nyModified = nyModified;

    ce.beginPath();
    ce.strokeStyle = "#4dcfff";
    ce.moveTo(centerX, centerY);
    ce.lineTo(centerX + nx, centerY + ny);
    ce.stroke();
} //needs two different draw lines because the player's line targets the mouse

function Draw_Lines_AI() {
  for (var ai = 1; ai < world_objects[1].length; ai++) {
    var maxLen = world_objects[1][ai].w * cellSize.w / 2;
    var centerX = world_objects[1][ai].x + cellSize.w / 2;
    var centerY = world_objects[1][ai].y + cellSize.h / 2;

    var centerXP = player.x + cellSize.w * player.w / 2; //Player's x center coordinate
    var centerYP = player.y + cellSize.w * player.h / 2; //Player's y center coordinate
    var vx = centerXP - centerX;
    var vy = centerYP - centerY;
    var mag = Math.sqrt(vx * vx + vy * vy);
    var nx = vx / mag * maxLen;
    var ny = vy / mag * maxLen;
    world_objects[1][ai].nx = nx;
    world_objects[1][ai].ny = ny;

    var nxModified = vx / mag * (maxLen + 0.1 * cellSize.w);
    var nyModified = vy / mag * (maxLen + 0.1 * cellSize.h);
    world_objects[1][ai].nxModified = nxModified;
    world_objects[1][ai].nyModified = nyModified;

    ce.beginPath();
    ce.strokeStyle="#ff3333";
    ce.moveTo(centerX, centerY);
    ce.lineTo(centerX + nx, centerY + ny);
    ce.stroke();
  }
} //needs two different draw lines because the AI's line targets the player

function Draw_HP() {
  for(var ai = 0; ai < world_objects[1].length; ai++) {
    ce.font = "9px Arial";
    var string = Math.round(world_objects[1][ai].hp) + "/" + Math.round(world_objects[1][ai].maxHP);
    if(world_objects[1][ai].hp > (world_objects[1][ai].maxHP * 0.5)) ce.fillStyle = "black";
    else if(world_objects[1][ai].hp > (world_objects[1][ai].maxHP * 0.25)) ce.fillStyle = "orange";
    else ce.fillStyle = "#800000";
    ce.textAlign = "center";
    
    ce.fillText(string, world_objects[1][ai].x+11, world_objects[1][ai].y-1);
  }
}


function resetBulletTimers() {
  for(var i = 0; i < bullet_timers.length; i++) {
    clearInterval(bullet_timers[i]);
  }
  
    bullet_timers.push(setInterval(function() {
      for(var ai = 1; ai < world_objects[1].length; ai++) {
        addBulletAI(ai);
      }
    }, 2500));
}

function updatePanel() {
 document.getElementById("killCount").innerHTML = player.killed;
  document.getElementById("healthBoost").innerHTML = player.toKill;
  document.getElementById("highscore").innerHTML = localStorage.highscore;
}