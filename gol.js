(function(undefined) {

var
cells = [],
cellStates = [
	'#fff', // dead
	'#f00', // just toggled to alive
	'#00f', // two rounds alive
	'#000', // alive
	'#ff0', // just toggled to dead
	'#fff'  // two rounds dead
],
colored = true,
fps = 10,
rand = true,
randomThreshold = .3,
seed = 0,
currentSeed = 0,

cellCount = 0,
oldCells = [],
firstCells = [],
loop = undefined,
generation = 0,
paintAlive = true,

updateState = function(index) {
	state = cells[index];
	if ((state > 0 && state < 3) || state > 3) {
		state++;
	}
	if (state >= cellStates.length) {
		state = 0;
	}
	cells[index] = state;
},

random = function() {
	var x = Math.sin(currentSeed++) * 0x3fff;
	return x - Math.floor(x);
},

generateSeed = function() {
	seed = Math.floor(Math.random() * 0xffff);
	return this;
},

generateCurrentSeed = function() {
	currentSeed = seed / 0xfff;
},

resizeCanvas = function(gol) {
	if (gol.canvas === undefined) {
		return;
	}

	$(gol.canvas).attr({
		'width': gol.width(),
		'height': gol.height()
	});
};

function GOL(settings) {
	this.canvas = undefined;

	this.cols = 10;

	this.rows = 10;

	this.cellSize = 10;

	this.borderWidth = 4;

	this.gridWidth = 1;

	this.gridColor = '#ddd';

	this.autoPlay = true;

	var self = this;

	for (var key in settings) {
		if (this.hasOwnProperty(key)) {
			this[key] = settings[key];
		}
	}

	if (this.canvas === undefined) {
		this.canvas = $('<canvas id="gol" width="' + this.width() + '" height="' + this.height() + '"></canvas>').appendTo('body')[0];
	}

	resizeCanvas(this);

	cellCount = this.rows * this.cols;

	this.drawBackground();

	if (settings.stateColors !== undefined) {
		cellStates = settings.stateColors;
	}

	if (settings.monochrome !== undefined) {
		colored = !settings.monochrome;
	}

	if (settings.fps !== undefined) {
		fps = settings.fps;
	}

	rand = settings.random !== false;

	if (settings.seed !== undefined) {
		seed = settings.seed;
	} else {
		generateSeed();
	}
	generateCurrentSeed();

	if (settings.randomThreshold !== undefined) {
		randomThreshold = settings.randomThreshold;
	}

	if (rand) {
		this.randomize(seed);
	} else {
		this.clear();
	}

	generation = 0;
	firstCells = cells.slice();

	$(this.canvas).on('mousedown', function(e) {
		var
		offset = self.borderWidth,
		ctx = $(this)[0].getContext("2d"),
		cellIndex = self.cellIndexAtScreen(e.offsetX, e.offsetY);

		paintAlive = !self.isAlive(cellIndex);
		self.toggleAlive(cellIndex);
		self.draw();
	}).on('mousemove', function(e) {
		if (e.which == 1) {
			var cellIndex = self.cellIndexAtScreen(e.offsetX, e.offsetY);
			if (self.isAlive(cellIndex) !== paintAlive) {
				self.toggleAlive(cellIndex);
				self.draw();
			}
		}
	});

	if (this.autoPlay) {
		this.play();
	} else {
		this.draw();
	}

	return this;
}

GOL.prototype.step = function() {
	var
	neighbours,
	state;

	generation++;
	oldCells = cells.slice();

	for (var i = 0; i < cellCount; i++) {
		neighbours = this.countNeighbours(i, true);
		if (this.isAlive(i, true)) {
			if (neighbours < 2 || neighbours > 3) {
				this.toggleAlive(i, colored);
			} else {
				updateState(i);
			}
		} else if (neighbours == 3) {
			this.toggleAlive(i, colored);
		} else {
			updateState(i);
		}
	}

	return this.draw();
}

GOL.prototype.drawBackground = function() {
	var
	ctx = this.canvas.getContext("2d"),
	offset = this.borderWidth;

	ctx.fillStyle = this.gridColor;

	ctx.beginPath();
	ctx.rect(0, 0, this.width(), this.height());
	ctx.closePath();
	ctx.fill();

	return this;
}

GOL.prototype.draw = function() {
	var
	ctx = this.canvas.getContext("2d"),
	offset = this.borderWidth,
	cellSize = this.cellSize,
	pos;

	for (var i = 0; i < cellCount; i++) {
		ctx.fillStyle = cellStates[cells[i]];
		pos = this.cellPosition(i);
		ctx.fillRect(offset + (pos.x * cellSize + pos.x * this.gridWidth), offset + (pos.y * cellSize + pos.y * this.gridWidth), cellSize, cellSize);
	}

	return this;
}

GOL.prototype.clear = function() {
	for (var i = 0; i < cellCount; i++) {
		cells[i] = 0;
	}

	generation = 0;
	firstCells = cells.slice();

	this.draw();

	return this;
}

GOL.prototype.randomize = function(newSeed) {
	threshold = 1 - randomThreshold;

	if (newSeed === undefined) {
		generateSeed();
	} else {
		seed = newSeed;
	}
	generateCurrentSeed();

	for (var i = 0; i < cellCount; i++) {
		cells[i] = random() < threshold ? 0 : 3;
	}

	generation = 0;
	firstCells = cells.slice();

	this.draw();

	return this;
}

GOL.prototype.reset = function() {
	generateCurrentSeed();

	generation = 0;
	cells = firstCells.slice();

	this.draw();

	return this;
}

GOL.prototype.isAlive = function(index, old) {
	var currentCells = old === true ? oldCells : cells;
	return currentCells[index] > 0 && currentCells[index] < 4;
}

GOL.prototype.toggleAlive = function(index, soft) {
	if (this.isAlive(index)) {
		cells[index] = soft === true ? 4 : 0;
	} else {
		cells[index] = soft === true ? 1 : 3;
	}

	return this;
}

GOL.prototype.countNeighbours = function(index, old) {
	var
	pos = this.cellPosition(index),
	count = 0;

	for (var y = pos.y - 1; y <= pos.y + 1; y++) {
		for (var x = pos.x - 1; x <= pos.x + 1; x++) {
			if (x == pos.x && y == pos.y) {
				continue;
			}
			if (this.isAlive(this.cellIndexAt(x, y), old)) {
				count++;
			}
		}
	}

	return count;
}

GOL.prototype.cellIndexAt = function(x, y) {
	if (x < 0) {
		x = this.cols - 1;
	} else if (x >= this.cols) {
		x = 0;
	}

	if (y < 0) {
		y = this.rows - 1;
	} else if (y >= this.rows) {
		y = 0;
	}

	return Math.floor(y * this.cols + x);
}

GOL.prototype.cellIndexAtScreen = function(x, y) {
	var divisor = this.cellSize + this.gridWidth;
	x = (x - this.borderWidth) / divisor;
	y = (y - this.borderWidth) / divisor;
	if (x < 0) {
		x = 0;
	}
	if (y < 0) {
		y = 0;
	}
	return this.cellIndexAt(Math.floor(x), Math.floor(y));
}

GOL.prototype.cellPosition = function(index) {
	return {
		x: index % this.cols,
		y: Math.floor(index / this.cols)
	};
}

GOL.prototype.cellState = function(index, value) {
	if (value === undefined) {
		return cellStates[index];
	}

	cellStates[index] = value;

	return this;
}

GOL.prototype.width = function() {
	return this.cols * this.cellSize + (this.cols - 1) * this.gridWidth + this.borderWidth * 2;
}

GOL.prototype.height = function() {
	return this.rows * this.cellSize + (this.rows - 1) * this.gridWidth + this.borderWidth * 2;
}

GOL.prototype.generation = function() {
	return generation;
}

GOL.prototype.cellCount = function() {
	return cellCount;
}

GOL.prototype.play = function() {
	if (this.isPlaying()) {
		return;
	}

	var self = this;

	loop = window.setInterval(function() {
		self.step();
	}, 1000 / fps);

	return this;
}

GOL.prototype.pause = function() {
	if (!this.isPlaying()) {
		return;
	}

	window.clearInterval(loop);
	loop = undefined;

	return this;
}

GOL.prototype.stop = function() {
	this.pause();
	return this;
}

GOL.prototype.isPlaying = function() {
	return loop !== undefined;
}

GOL.prototype.fps = function(value) {
	if (value === undefined) {
		return fps;
	}

	fps = value;
	if (this.isPlaying) {
		this.pause();
		this.play();
	}

	return this;
}

GOL.prototype.colored = function(value) {
	if (value === undefined) {
		return colored;
	}

	colored = value;

	return this;
}

GOL.prototype.monochrome = function(value) {
	if (value === undefined) {
		return !colored;
	}

	colored = !value;

	return this;
}

GOL.prototype.randomThreshold = function(value) {
	if (value === undefined) {
		return randomThreshold;
	}

	randomThreshold = value;

	return this;
}

GOL.prototype.seed = function(value) {
	if (value === undefined) {
		return seed;
	}

	seed = value;

	return this;
}

window.GOL = GOL;

}(undefined))