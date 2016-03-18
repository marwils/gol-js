var GOL = (function(window, undefined) {

	var
	_private = Symbol('private');

	function GOL(settings) {
		var self = this;

		this[_private] = {
			cells: [],
			cellStates: [
				'#fff', // dead
				'#f00', // just toggled to alive
				'#00f', // two rounds alive
				'#000', // alive
				'#ff0', // just toggled to dead
				'#fff'  // two rounds dead
			],
			colored: true,
			fps: 10,
			rand: true,
			randomThreshold: .3,
			seed: 0,
			currentSeed: 0,

			cellCount: 0,
			oldCells: [],
			firstCells: [],
			loop: undefined,
			generation: 0,
			paintAlive: true,

			mousePosition: undefined,

			updateState: function(index) {
				var state = self[_private].cells[index];

				if ((state > 0 && state < 3) || state > 3) {
					state++;
				}
				if (state >= self[_private].cellStates.length) {
					state = 0;
				}
				self[_private].cells[index] = state;
			},

			random: function() {
				var x = Math.sin(self[_private].currentSeed++) * 0x3fff;
				return x - Math.floor(x);
			},

			generateSeed: function() {
				self[_private].seed = Math.floor(Math.random() * 0xffff);
			},

			generateCurrentSeed: function() {
				self[_private].currentSeed = self[_private].seed / 0xfff;
			},

			resizeCanvas: function() {
				$(self.canvas).attr({
					'width': self.width(),
					'height': self.height()
				});
			},

			getRules: function(rule, anti) {
				var
				rulesText = rule.split('/'),
				keepText = rulesText[0],
				birthText = rulesText[1],
				birth = [],
				die = [];

				for (var i = 0; i <= 8; i++) {
					if (birthText.indexOf(i) > -1) {
						birth.push(i);
					} else if (keepText.indexOf(i) === -1) {
						die.push(i);
					}
				}
				if (anti !== true) {
					return {
						birth: birth,
						die: die
					};
				}

				var
				tempBirth = [];
				tempDie = [];

				for (var i = 0; i < die.length; i++) {
					tempBirth.push(8 - die[i]);
				}
				for (var i = 0; i < birth.length; i++) {
					tempDie.push(8 - birth[i]);
				}
				return {
					birth: tempBirth,
					die: tempDie
				};
			}
		};

		settings = settings || {};

		this.canvas = undefined;

		this.cols = 10;

		this.rows = 10;

		this.cellSize = 10;

		this.borderWidth = 4;

		this.gridWidth = 1;

		this.gridColor = '#ddd';

		this.autoPlay = true;

		this.rules = {
			birth: [3],
			die: [0, 1, 4, 5, 6, 7, 8]
		};

		this.rule = '23/3'; // classic

/*		this.rule = '1357/1357'; // kopierwelt
		this.rule = '3/3'; // statisch
		this.rule = '13/3'; // oszillierend
		this.rule = '34/3'; // oszillierend
		this.rule = '35/3'; // mit bewegenden objekten
		this.rule = '2/3'; // ähnlich klassisch
		this.rule = '24/3'; // maze
		this.rule = '245/3'; // maze
		this.rule = '125/36'; // virus
		this.rule = '236/3'; // ähnlich klassisch
		this.rule = '135/35'; // erweitertes 13/3
		this.rule = '12345/3'; // maze
		this.rule = '24/35'; // lines
		this.rule = '0123/01234'; // flickering

		this.rule = '234/4';
*/
		this.antiRule = false;
		this.rules = this[_private].getRules(this.rule, this.antiRule);

		console.log(this.rules);

		for (var key in settings) {
			if (this.hasOwnProperty(key)) {
				this[key] = settings[key];
			}
		}

		if (this.canvas === undefined) {
			this.canvas = $('<canvas width="' + this.width() + '" height="' + this.height() + '"></canvas>').appendTo('body')[0];
		}

		this[_private].resizeCanvas();

		this[_private].cellCount = this.rows * this.cols;

		this.drawBackground();

		if (settings.stateColors !== undefined) {
			this[_private].cellStates = settings.stateColors;
		}

		if (settings.monochrome !== undefined) {
			this[_private].colored = !settings.monochrome;
		}

		if (settings.fps !== undefined) {
			this[_private].fps = settings.fps;
		}

		this[_private].rand = settings.random !== false;

		if (settings.seed !== undefined) {
			this[_private].seed = settings.seed;
		} else {
			this[_private].generateSeed();
		}
		this[_private].generateCurrentSeed();

		if (settings.randomThreshold !== undefined) {
			this[_private].randomThreshold = settings.randomThreshold;
		}

		if (this[_private].rand) {
			this.randomize(this[_private].seed);
		} else {
			this.clear();
		}

		this[_private].generation = 0;
		this[_private].firstCells = this[_private].cells.slice();

		$(this.canvas).on('mousedown', function(e) {
			var
			offset = self.borderWidth,
			ctx = $(this)[0].getContext("2d"),
			cellIndex = self.cellIndexAtScreen(e.offsetX, e.offsetY);

			self[_private].paintAlive = !self.isAlive(cellIndex);
			self.toggleAlive(cellIndex);
			self.draw();
		}).on('mousemove', function(e) {
			self.drawPointer(true);
			self[_private].mousePosition = {x: e.offsetX, y: e.offsetY};
			if (e.which == 1) {
				var cellIndex = self.cellIndexAtScreen(e.offsetX, e.offsetY);
				if (self.isAlive(cellIndex) !== self[_private].paintAlive) {
					self.toggleAlive(cellIndex);
					self.draw();
				}
			} else {
				self.drawPointer();
			}
		}).on('mouseleave', function(e) {
			self.drawPointer(true);
			self[_private].mousePosition = undefined;
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

		this[_private].generation++;
		this[_private].oldCells = this[_private].cells.slice();

		for (var i = 0; i < this[_private].cellCount; i++) {
			neighbours = this.countNeighbours(i, true);
			if (this.isAlive(i, true)) {
				if ($.inArray(neighbours, this.rules.die) > -1) {
					this.toggleAlive(i, this[_private].colored);
				} else {
					this[_private].updateState(i);
				}
			} else if ($.inArray(neighbours, this.rules.birth) > -1) {
				this.toggleAlive(i, this[_private].colored);
			} else {
				this[_private].updateState(i);
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

		for (var i = 0; i < this[_private].cellCount; i++) {
			pos = this.cellPosition(i);
			ctx.fillStyle = this[_private].cellStates[this[_private].cells[i]];
			ctx.fillRect(offset + (pos.x * cellSize + pos.x * this.gridWidth), offset + (pos.y * cellSize + pos.y * this.gridWidth), cellSize, cellSize);
		}

		this.drawPointer();

		return this;
	}

	GOL.prototype.drawPointer = function(clear) {
		var
		cursor = [[1]],
		ctx = this.canvas.getContext("2d"),
		offset = this.borderWidth,
		cellSize = this.cellSize,
		mousePos = this[_private].mousePosition,
		pos,
		pixel,
		cellIndex;

		if (mousePos === undefined) {
			return;
		}

		for (var y = 0; y < cursor.length; y++) {
			for (var x = 0; x < cursor[y].length; x++) {
				pixel = cursor[y][x];
				if (pixel == 1) {
					cellIndex = this.cellIndexAtScreen(mousePos.x, mousePos.y);
					pos = this.cellPosition(cellIndex);
					ctx.fillStyle = clear ? this[_private].cellStates[this[_private].cells[cellIndex]] : '#f0f';
					ctx.fillRect(offset + (pos.x * cellSize + pos.x * this.gridWidth), offset + (pos.y * cellSize + pos.y * this.gridWidth), cellSize, cellSize);
				}
			}
		}
	}

	GOL.prototype.clear = function() {
		for (var i = 0; i < this[_private].cellCount; i++) {
			this[_private].cells[i] = 0;
		}

		this[_private].generation = 0;
		this[_private].firstCells = this[_private].cells.slice();

		this.draw();

		return this;
	}

	GOL.prototype.randomize = function(newSeed) {
		threshold = 1 - this[_private].randomThreshold;

		if (newSeed === undefined) {
			this[_private].generateSeed();
		} else {
			this[_private].seed = newSeed;
		}
		this[_private].generateCurrentSeed();

		for (var i = 0; i < this[_private].cellCount; i++) {
			this[_private].cells[i] = this[_private].random() < threshold ? 0 : 3;
		}

		this[_private].generation = 0;
		this[_private].firstCells = this[_private].cells.slice();

		this.draw();

		return this;
	}

	GOL.prototype.reset = function() {
		this[_private].generateCurrentSeed();

		this[_private].generation = 0;
		this[_private].cells = this[_private].firstCells.slice();

		this.draw();

		return this;
	}

	GOL.prototype.isAlive = function(index, old) {
		var currentCells = old === true ? this[_private].oldCells : this[_private].cells;
		return currentCells[index] > 0 && currentCells[index] < 4;
	}

	GOL.prototype.toggleAlive = function(index, soft) {
		if (this.isAlive(index)) {
			this[_private].cells[index] = soft === true ? 4 : 0;
		} else {
			this[_private].cells[index] = soft === true ? 1 : 3;
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
			return this[_private].cellStates[index];
		}

		this[_private].cellStates[index] = value;

		return this;
	}

	GOL.prototype.width = function() {
		return this.cols * this.cellSize + (this.cols - 1) * this.gridWidth + this.borderWidth * 2;
	}

	GOL.prototype.height = function() {
		return this.rows * this.cellSize + (this.rows - 1) * this.gridWidth + this.borderWidth * 2;
	}

	GOL.prototype.generation = function() {
		return this[_private].generation;
	}

	GOL.prototype.cellCount = function() {
		return this[_private].cellCount;
	}

	GOL.prototype.play = function() {
		if (this.isPlaying()) {
			return;
		}

		var self = this;

		this[_private].loop = window.setInterval(function() {
			self.step();
		}, 1000 / this[_private].fps);

		return this;
	}

	GOL.prototype.pause = function() {
		if (!this.isPlaying()) {
			return;
		}

		window.clearInterval(this[_private].loop);
		this[_private].loop = undefined;

		return this;
	}

	GOL.prototype.stop = function() {
		this.pause();
		return this;
	}

	GOL.prototype.isPlaying = function() {
		return this[_private].loop !== undefined;
	}

	GOL.prototype.fps = function(value) {
		if (value === undefined) {
			return this[_private].fps;
		}

		this[_private].fps = value;
		if (this.isPlaying) {
			this.pause();
			this.play();
		}

		return this;
	}

	GOL.prototype.colored = function(value) {
		if (value === undefined) {
			return this[_private].colored;
		}

		this[_private].colored = value;

		return this;
	}

	GOL.prototype.monochrome = function(value) {
		if (value === undefined) {
			return !this[_private].colored;
		}

		this[_private].colored = !value;

		return this;
	}

	GOL.prototype.randomThreshold = function(value) {
		if (value === undefined) {
			return this[_private].randomThreshold;
		}

		this[_private].randomThreshold = value;

		return this;
	}

	GOL.prototype.seed = function(value) {
		if (value === undefined) {
			return this[_private].seed;
		}

		this[_private].seed = value;

		return this;
	}

	return GOL;

}(window, undefined));
