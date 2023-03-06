let gl, sprite, lastTime;

const gravity = 10;
const programs = [];
const minimum_fps = 0.016666666666666666;
const aspectRatioHeight = 0.5568627450980392;

const m4 = {

    identity() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]
    },

    translation(tx, ty, tz) {
        return [
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            tx, ty, tz, 1,
        ];
    },

    rotation (angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);

        return [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
    },

    translate(m, tx, ty, tz) {
        return m4.multiply(m, m4.translation(tx, ty, tz));
    },

    rotate(m, angleInRadians) {
        return m4.multiply(m, m4.rotation(angleInRadians));
    },

    orthographic(left, right, bottom, top, near, far) {
        return [
            2 / (right - left), 0, 0, 0,
            0, 2 / (top - bottom), 0, 0,
            0, 0, 2 / (near - far), 0,

            (left + right) / (left - right),
            (bottom + top) / (bottom - top),
            (near + far) / (near - far),
            1,
        ];
    },

    multiply(a, b) {
        const b00 = b[0 * 4 + 0];
        const b01 = b[0 * 4 + 1];
        const b02 = b[0 * 4 + 2];
        const b03 = b[0 * 4 + 3];
        const b10 = b[1 * 4 + 0];
        const b11 = b[1 * 4 + 1];
        const b12 = b[1 * 4 + 2];
        const b13 = b[1 * 4 + 3];
        const b20 = b[2 * 4 + 0];
        const b21 = b[2 * 4 + 1];
        const b22 = b[2 * 4 + 2];
        const b23 = b[2 * 4 + 3];
        const b30 = b[3 * 4 + 0];
        const b31 = b[3 * 4 + 1];
        const b32 = b[3 * 4 + 2];
        const b33 = b[3 * 4 + 3];
        const a00 = a[0 * 4 + 0];
        const a01 = a[0 * 4 + 1];
        const a02 = a[0 * 4 + 2];
        const a03 = a[0 * 4 + 3];
        const a10 = a[1 * 4 + 0];
        const a11 = a[1 * 4 + 1];
        const a12 = a[1 * 4 + 2];
        const a13 = a[1 * 4 + 3];
        const a20 = a[2 * 4 + 0];
        const a21 = a[2 * 4 + 1];
        const a22 = a[2 * 4 + 2];
        const a23 = a[2 * 4 + 3];
        const a30 = a[3 * 4 + 0];
        const a31 = a[3 * 4 + 1];
        const a32 = a[3 * 4 + 2];
        const a33 = a[3 * 4 + 3];

        return [
            b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
            b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
            b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
            b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
            b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
            b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
            b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
            b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
            b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
            b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
            b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
            b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
            b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
            b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
            b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
            b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ];
    }
}

/**
 * Generates random number between min and max 
 * with max exclusive
 * @param {number} min range minimum
 * @param {number} max range maximum
 * @returns 
 */
const randRange = (min, max) => Math.random() * (max - min + 1) + min;

const audio = {
    init() {
        this.die = document.getElementById("die-aud");
        this.hit = document.getElementById("hit-aud");
        this.wing = document.getElementById("wing-aud");
        this.point = document.getElementById("point-aud");
    }
}

const game = {
    sx: 0,  // use for manipulating texture for day and night toggle
    buffer: null,
    pipes: [],
    timeOut: 5.5,   // timeout untill the first pipe is spawn
    stateMode: {
        OVER: "Game is over",
        ACTIVE: "Game is running",
        IDLE: "Splash is playing"
    },

    restart() {
        this.isFirstRun = true;
        this.score = 0;
        this.pipes = [];
        bird.velocity = {x: 0, y: 0};
        bird.rotation = 0;
        Pipe.COUNTER = 0;
        bird.translation.y = (Pipe.HEIGHT + Pipe.SPACING) * 0.5 - bird.height * 0.5;
        this.state = this.stateMode.ACTIVE;
        floor.speed = floor.lastSpeed;
        lastTime = Date.now();
        this.sx = [0, 146][Math.floor(Math.random() * 2)];
    },

    set score(s) {
        this._score = s;
        if(this.state == this.stateMode.ACTIVE)
            this.scoreEl.innerHTML = Math.floor(s / 2);
        else 
            this.scoreEl.innerHTML = "";
    },

    get score() { return this._score },

    init() {
        this.scoreEl = document.getElementById("score");
        this.buffer = gl.createBuffer();
        this.data = setImageData(sprite, 0, 0, 144, 260, gl.canvas.width);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data.data), gl.DYNAMIC_DRAW);
        floor.init();
        bird.init();
        this.state = this.stateMode.IDLE;
    },

    /**
     * This method comes in handy while drawing everything when 
     * game is idle and/or over... 
     * 
     * it's like setImageData 
     * 
     * @param {WebGLProgram} program program
     * @param {number} sx source begin
     * @param {number} sy source begin on the y-axis
     * @param {number} sw source width
     * @param {number} sh source height
     * @param {number} w destination width
     * @param {number} x translation x
     * @param {number} y translation y
     */
    drawAt(program, sx, sy, sw, sh, w, x = 0, y = 0) {
        let mTransformed = m4.translation(x, y, 0);
        gl.uniformMatrix4fv(program.uniforms.model, false, mTransformed);
        let data = setImageData(sprite, sx, sy, sw, sh, w);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.data), gl.DYNAMIC_DRAW);
        drawImage(gl, this.buffer, program.attributes.pos, program.attributes.tex);
    }
}


const floor = {
    array: [],
    lastSpeed: 100,
    speed: 100,

    init() {

        this.data = setImageData(sprite, 300, 0, 155, 55, gl.canvas.width);
        this.y = gl.canvas.height - this.data.height;
        this.array.push({x: 0, y: this.y});
        this.array.push({x: gl.canvas.width, y: this.y});

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data.data), gl.STATIC_DRAW);

        Pipe.SPACING = this.y * 0.2;
        Pipe.HEIGHT = this.y - Pipe.SPACING;
    },

    update(deltaTime) {
        this.array.forEach(data => {
            data.x -= this.speed * deltaTime;
            if(data.x < -gl.canvas.width) {
                data.x = gl.canvas.width - 6;
            }
        });
    },

    draw(program) {
        this.array.forEach(data => {
            const modelMatrix = m4.translation(data.x, data.y, 0);
            gl.uniformMatrix4fv(program.uniforms.model, false, modelMatrix);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            drawImage(gl, this.buffer, program.attributes.pos, program.attributes.tex);
        });
    }

}


class Pipe {

    constructor(w, h, type = "up" ) {
        this.translation = {x: gl.canvas.width, y: 0};
        const sx = type === "up" ? 56 : 84;
        this.data = setImageData(sprite, sx, 324, 26, 160, w, h); 
        this.width = this.data.width;
        this.height = this.data.height;

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data.data), gl.DYNAMIC_DRAW);
        this._hasPassed = false;
    }

    update(dt) {
        this.translation.x -= floor.speed * dt;

        // AABB collision check
        if(this.translation.x + this.width > bird.translation.x && 
            bird.translation.x + bird.width > this.translation.x && 
            this.translation.y + this.height > bird.translation.y && 
            bird.translation.y + bird.height > this.translation.y
        ) {
            floor.speed = 0;
            audio.hit.play();
        }

        // check if pipe is offscreen and delete it
        if(this.translation.x < -this.width) {
            game.pipes.splice(game.pipes.indexOf(this), 1);
            gl.deleteBuffer(this.buffer);
        }

        // check if the bird flap successfully past the pipe
        if(this.translation.x + this.width < bird.translation.x) {
            if(!this._hasPassed) {
                game.score++;
                this._hasPassed = true;
                audio.point.play();
            }
        }
    }

    draw(program) {
        let mTransformed = m4.translation(this.translation.x, this.translation.y, 0);
        gl.uniformMatrix4fv(program.uniforms.model, false, mTransformed);
        gl.bindBuffer(gl.ARRAY_BUFFER, game.buffer);
        drawImage(gl, this.buffer, program.attributes.pos, program.attributes.tex);
    }

    static create() {
        // top pipe
        let height = randRange(Pipe.HEIGHT * 0.1, Pipe.HEIGHT);
        const width = gl.canvas.width * 0.15;
        let pipe = new Pipe(width, height);
        game.pipes.push(pipe);

        // bottom pipe
        height = Pipe.HEIGHT - height;
        pipe = new Pipe(width, height, "down");
        pipe.translation.y = floor.y - height;
        game.pipes.push(pipe);
    }

}


Object.defineProperties(Pipe, {
    // sumation of both pipe heights
    HEIGHT: {
        value: 0, 
        writable: true
    },
    // spacing between both pipes
    SPACING: {
        value: 0, 
        writable: true
    },
    // timeout untill new pipe is spawn
    TIMEOUT: {
        value: 3,
        writable: true
    },
    // timeout counter
    COUNTER: {
        value: 0, 
        writable: true
    }
});


const bird = {

    jumpForce: 270,

    init() {
        this.width = Pipe.SPACING * 0.25;
        this.height = this.width;
        this.translation = {x: gl.canvas.width * 0.2, y: 0};
        this.velocity = {x: 0, y: 0};
        this.data = setImageData(sprite, 30, 500, 18, 14, this.width, this.height);
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data.data), gl.STATIC_DRAW);
        this.animationFrame = [2, 30, 58];
        this._animationCounter = 0;
        this._animationIndex = 0;
        this.rotation = 0;
    },

    update(dt) {
        this.velocity.y += gravity;
        this.translation.y += this.velocity.y * dt;
        this._animationCounter += dt;

        if(this.velocity.y > 0) {
            // bird is falling
            this._animationIndex = 0;
            this.rotation += dt * 0.8;
            if(this.rotation > Math.PI / 6) {
                this.rotation = Math.PI / 6;
            }
        } else {
            // make bird flap
            this.rotation = 0;
            if(this._animationCounter >= 0.05) {
                this._animationCounter = 0;
                this._animationIndex++;
                if(this._animationIndex >= this.animationFrame.length) 
                    this._animationIndex = 0;
            }
        }

        if(this.translation.y < 0)  {
            this.translation.y = 0;
            this.velocity.y *= -0.8;
        }
        if(this.translation.y + this.height >= floor.y) {
            this.translation.y = floor.y - this.height;
            game.state = game.stateMode.OVER;
            audio.die.play();
        }

    },

    draw(program) {
        let modelMatrix = m4.translation(this.translation.x, this.translation.y, 0);
        modelMatrix = m4.rotate(modelMatrix, this.rotation);
        const sx = this.animationFrame[this._animationIndex];
        this.data = setImageData(sprite, sx, 490, 18, 14, this.width, this.height);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data.data), gl.STATIC_DRAW);
        gl.uniformMatrix4fv(program.uniforms.model, false, modelMatrix);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        drawImage(gl, this.buffer, program.attributes.pos, program.attributes.tex);
    }

}


const setupCanvas = () => {
    const gameArea = document.getElementById("game-area");
    const windowWidth = Math.min(Math.min(400, innerHeight), innerWidth);
    gameArea.style.width = windowWidth + "px";
    gameArea.style.height = windowWidth / aspectRatioHeight + "px";

    const canvas = document.getElementById("gl");
    canvas.width = parseFloat(window.getComputedStyle(canvas).getPropertyValue("width"));
    canvas.height = parseFloat(window.getComputedStyle(canvas).getPropertyValue("height"));
    if(!canvas) {
        alert("Your Browser does not support HTML5 Canvas: That's a weird browser");
        throw new Error("Canvas Element not supported");
    }

    // initialise webgl
    gl = canvas.getContext("webgl", {
        depth: false,
        premultipliedAlpha: false,
        antialias: false,
        alpha: false });

    if(!gl) {
        alert("Failed to created Webgl1.0 rendering context");
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}


const setupPrograms = () => {
    const vertexShaderSource = document.getElementById("vertex-shader").textContent;
    const fragmentShaderSource = document.getElementById("fragment-shader").textContent;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    programs.push({
        program,
        attributes: {
            position: gl.getAttribLocation(program, "aPos"),
            tex: gl.getAttribLocation(program, "aTexCoord")
        },
        uniforms: {
            projection: gl.getUniformLocation(program, "uProjectionMatrix"),
            model: gl.getUniformLocation(program, "uModelMatrix")
        }
    });
}


const update = deltaTime => {
    events.onActive();
    if(game.state == game.stateMode.ACTIVE) {
        bird.update(deltaTime);
        game.pipes.forEach(pipe => pipe.update(deltaTime));
        floor.update(deltaTime);
    
        // update pipe 
        Pipe.COUNTER += deltaTime;
        if(game.isFirstRun) {
            if(Pipe.COUNTER >= game.timeOut) {
                Pipe.create();
                game.isFirstRun = false;
                Pipe.COUNTER = 0;
            }
        } else {
            if(Pipe.COUNTER >= Pipe.TIMEOUT) {
                Pipe.create();
                Pipe.COUNTER = 0;
            }
        }
    }

    events.active = null;
}

const draw = () => {
    let program;
    gl.clear(gl.COLOR_BUFFER_BIT);
    program = programs[0];
    gl.useProgram(program.program);

    const mProjection = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    gl.uniformMatrix4fv(program.uniforms.projection, false, mProjection);
    gl.uniformMatrix4fv(program.uniforms.model, false, m4.identity());


    // draw background image
    game.drawAt(program, game.sx, 0, 144, 260, gl.canvas.width);
    floor.draw(program);
    game.pipes.forEach(pipe => pipe.draw(program));

    if(game.state == game.stateMode.IDLE) {
        // idle
        game.drawAt(program, 345, 90, 100, 26, gl.canvas.width, 0, gl.canvas.height * 0.05);
        game.drawAt(program, 290, 58, 100, 26, gl.canvas.width * 0.7, 
            gl.canvas.width * 0.5 - gl.canvas.width * 0.35, gl.canvas.height * 0.3);
        game.drawAt(program, 300, 90, 40, 20, gl.canvas.width * 0.4, 
        gl.canvas.width * 0.5 - gl.canvas.width * 0.2, gl.canvas.height * 0.5);
        game.drawAt(program, 290, 120, 60, 38, gl.canvas.width * 0.8, 
            gl.canvas.width * 0.5 - gl.canvas.width * 0.4, gl.canvas.height * 0.7);

    } else if(game.state == game.stateMode.OVER) {
        // over
        game.drawAt(program, 390, 58, 105, 28, gl.canvas.width * 0.7, 
            gl.canvas.width * 0.5 - gl.canvas.width * 0.35, gl.canvas.height * 0.2);
        game.drawAt(program, 350, 116, 60, 32, gl.canvas.width * 0.4, 
            gl.canvas.width * 0.5 - gl.canvas.width * 0.2, gl.canvas.height * 0.35);
        bird.draw(program);
    } else {
        // active
        bird.draw(program);
    }
}

const animate = () => {
    const now = Date.now();
    let deltaTime = (now - lastTime) * 1e-3;
    while(deltaTime > minimum_fps) {
        deltaTime -= minimum_fps;
        update(minimum_fps);
    }
    update(deltaTime);
    lastTime = Date.now();
    draw();
    requestAnimationFrame(animate);
}


const events = {
    active: null,
    onActive() {
        switch(this.active) {
            case "space":
                switch(game.state) {
                    case game.stateMode.OVER:
                        game.score = 0;
                        game.state = game.stateMode.IDLE;
                        break;
                    case game.stateMode.IDLE:
                        game.state = game.stateMode.ACTIVE;
                        game.restart();
                        break;
                    case game.stateMode.ACTIVE:
                        if(floor.speed > 0) {
                            bird.velocity.y = -bird.jumpForce;
                            audio.wing.play();
                        }
                        break;
                }   
                break;
        }
    }
}


const eventHandler = () => {
    window.addEventListener("keyup", e => {
        switch(e.key) {
            case " ":
                events.active = "space";
                break;
        }
    });
    window.addEventListener("touchend", e => {
        events.active