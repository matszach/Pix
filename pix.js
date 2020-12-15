"use strict;"
class Pix {

    // ================================ CONSTRUCTOR AND SETUP METHODS ===============================
    constructor(parentId, args) {
       args = args || {}; 
       this._validateParams(parentId, args);
       this._assignParams(parentId, args);
       this._initAlphaBlend();
       this._initiateCanvas();
       this._attachResizeListeners();
    }

    _validateParams(parentId, args) {
        if(!parentId) {
            throw new Error(`Required 'parentId' has not been specified.`);
        } else if (!document.getElementById(parentId)) {
            throw new Error(`HTML element of id = '${parentId}' could not be located.`);
        }
    }

    _assignParams(parentId, args) {
        this.parentId = parentId;
        this.canvasClass = args.canvasClass || `${this.parentId}-canvas`;
        this.refitOnResize = args.refitOnResize === false ? false : true;
        this.onRefit = args.onRefit || (() => {});
        this.scale = args.scale || 1;
        this.offsetX = args.offsetX || 0;
        this.offsetY = args.offsetY || 0;
        this._alphaBlend = args.alphaBlend === false ? false : true;
    }

    _initAlphaBlend() {
        if(this._alphaBlend) {
            this.enableAlphaBlend();
        } else {
            this.disableAlphaBlend();
        }
    }

    _initiateCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add(this.canvasClass);
        this.context = this.canvas.getContext('2d');
        this.parent = document.getElementById(this.parentId);
        this.parent.appendChild(this.canvas);
    }

    _attachResizeListeners() {
        if(this.refitOnResize) {
            const xel = this;
            window.addEventListener('resize', () => {
                xel.refit();
                xel.onRefit();
            });
            xel.refit();
        }
    }

    // ================================ META METHODS ===============================
    refit() {
        this.canvas.width = this.parent.clientWidth;
        this.canvas.height = this.parent.clientHeight;
        return this;
    }

    width() {
        return this.canvas.width;
    }

    height() {
        return this.canvas.height;
    }

    // ================================ CONFIG METHODS ===============================
    disableAlphaBlend() {
        this._alphaBlend = false;
        this._blendPixelData = (i, r, g, b, a) => {
            this.imageDataArray[i] = r;
            this.imageDataArray[i + 1] = g;
            this.imageDataArray[i + 2] = b;
        };
        return this;
    }
    
    enableAlphaBlend() {
        this._alphaBlend = true;
        this._blendPixelData = (i, r, g, b, a) => {
            const blend = a / 255;
            const oBlend = (1 - blend);
            this.imageDataArray[i] = Math.round(r * blend + this.imageDataArray[i] * oBlend);
            this.imageDataArray[i + 1] = Math.round(g * blend + this.imageDataArray[i + 1] * oBlend);
            this.imageDataArray[i + 2] = Math.round(b * blend + this.imageDataArray[i + 2] * oBlend);
        };
        return this;
    }

    isAlphaBlend() {
        return this._alphaBlend;
    }

    enableRefitOnResize() {
        this.refitOnResize = true;
        this._attachResizeListeners();
        return this;
    }

    // ================================ LIFECYCLE METHODS ===============================
    initImageData(width, height) {
        this.imageDataWidth = width || this.canvas.width;
        this.imageDataHeight = height || this.canvas.height;
        this.imageData = this.context.createImageData(this.imageDataWidth, this.imageDataHeight);
        this.imageDataArray = this.imageData.data;
        for(let i = 3; i < this.imageDataArray.length; i += 4) {
            this.imageDataArray[i] = 255;
        }
    }

    fill(r, g, b, a) {
        for(let i = 0; i < this.imageDataArray.length; i += 4) {
            this._blendPixelData(i, r, g, b, a);
        }
    }

    // Does not perform alpha blend, even when active, and thus is more efficient in overriding imageDate
    clear(r, g, b) {
        r = r || 0;
        g = g || 0;
        b = b || 0;
        for(let i = 0; i < this.imageDataArray.length; i += 4) {
            this.imageDataArray[i] = r;
            this.imageDataArray[i + 1] = g;
            this.imageDataArray[i + 2] = b;
        }
    }

    getPixel(x, y) {
        const i = (y * this.imageDataWidth + x) * 4;
        return this.imageDataArray.slice(i - 1, i + 2);
    }

    putPixel(x, y, r, g, b, a) {
        const i = (y * this.imageDataWidth + x) * 4;
        this._blendPixelData(i, r, g, b, a);
    }

    putRectangle(x, y, width, height, r, g, b, a) {
        x = Math.round(x);
        y = Math.round(y);
        for(let xi = x; xi < x + width; xi++) {
            for(let yi = y; yi < y + height; yi++) {
                this.putPixel(xi, yi, r, g, b, a);
            }
        }
    }

    putBox(x, y, width, height, thickness, r, g, b, a) {
        x = Math.round(x);
        y = Math.round(y);
        thickness = Math.round(thickness);
        const hThick = Math.round(thickness/2);
        this.putRectangle(x - hThick, y - hThick, width + thickness, thickness, r, g, b, a);
        this.putRectangle(x - hThick, y + hThick, thickness, height - thickness, r, g, b, a);
        this.putRectangle(x - hThick + width, y + hThick, thickness, height - thickness, r, g, b, a);
        this.putRectangle(x - hThick, y - hThick + height, width + thickness, thickness, r, g, b, a);
    }

    putCircle(x, y, radius, r, g, b, a) {
        x = Math.round(x);
        y = Math.round(y);
        radius = Math.round(radius);
        for(let xi = x - radius; xi < x + radius + 1; xi++) {
            for(let yi = y - radius; yi < y + radius + 1; yi++) {
                if((x - xi)**2 + (y - yi)**2 < radius**2) {
                    this.putPixel(xi, yi, r, g, b, a);
                }
            }
        }
    }
    
    putRing(x, y, radius, thickness, r, g, b, a) {
        x = Math.round(x);
        y = Math.round(y);
        radius = Math.round(radius);
        thickness = Math.round(thickness);
        const radIn = radius - thickness/2;
        const radOut = radius + thickness/2;
        for(let xi = x - radOut; xi < x + radOut + 1; xi++) {
            for(let yi = y - radOut; yi < y + radOut + 1; yi++) {
                const sq = (x - xi)**2 + (y - yi)**2;
                if(sq < radOut**2 && sq > radIn**2) {
                    this.putPixel(xi, yi, r, g, b, a);
                }
            }
        }
    }

    putLine(x1, y1, x2, y2, thickness, r, g, b, a) {
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        x2 = Math.round(x2);
        y2 = Math.round(y2);
        thickness = Math.round(thickness);
        const absX = Math.abs(x1 - x2);
        const absY = Math.abs(y1 - y2);
        if(absX > absY) {
            const yStep = (y2 - y1) / absX;
            let currY = y1;
            if(x1 < x2) {
                for(let x = x1; x < x2; x++) {
                    const minY = Math.floor(currY - thickness/2);
                    const maxY = Math.ceil(currY + thickness/2)
                    for(let y = minY; y < maxY; y++) {
                        this.putPixel(x, y, r, g, b, a);
                    } 
                    currY += yStep;
                }
            } else {
                for(let x = x1; x > x2; x--) {
                    const minY = Math.floor(currY - thickness/2);
                    const maxY = Math.ceil(currY + thickness/2)
                    for(let y = minY; y < maxY; y++) {
                        this.putPixel(x, y, r, g, b, a);
                    } 
                    currY += yStep;
                }
            }
        } else {
            const xStep = (x2 - x1) / absY;
            let currX = x1;
            if(y1 < y2) {
                for(let y = y1; y < y2; y++) {
                    const minX = Math.floor(currX - thickness/2);
                    const maxX = Math.ceil(currX + thickness/2)
                    for(let x = minX; x < maxX; x++) {
                        this.putPixel(x, y, r, g, b, a);
                    } 
                    currX += xStep;
                }
            } else {
                for(let y = y1; y > y2; y--) {
                    const minX = Math.floor(currX - thickness/2);
                    const maxX = Math.ceil(currX + thickness/2)
                    for(let x = minX; x < maxX; x++) {
                        this.putPixel(x, y, r, g, b, a);
                    } 
                    currX += xStep;
                }
            } 
        }
    }

    putPolyline(points, thickness, r, g, b, a) {
        for(let i = 0; i < points.length; i += 2) {
            this.putLine(points[i], points[i + 1], points[i + 2], points[i + 3], thickness, r, g, b, a);
        }
    }

    displayImageData(x, y) {
        // scale and offets should be talken in to accout here TODO
        this.context.putImageData(this.imageData, x || 0, y || 0);
    }


}
    






