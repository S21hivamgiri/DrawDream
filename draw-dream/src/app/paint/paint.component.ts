import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-paint',
  templateUrl: './paint.component.html',
  styleUrls: ['./paint.component.scss']
})
export class PaintComponent implements OnInit {
  height = 400;
  width = 600;
  tool = 'pencil';
  polygonPoints: { x: number, y: number }[] = [];
  arcPoints: { x: number, y: number }[] = [];
  density = 30;
  tmp_ctx!: CanvasRenderingContext2D;
  ctx!: CanvasRenderingContext2D;
  canvas!: HTMLCanvasElement;
  tmp_canvas!: HTMLCanvasElement;
  ppts:{x:number, y:number}[] = [];
  mouse = { x: 0, y: 0 };
  opacity = 1;
  lineWidth = 4;
  lineStyle = 'solid';
  start_mouse = { x: 0, y: 0 };
  
  ngOnInit() {
    this.initSetup()
  }

  constructor() { }

  initSetup() {
    let canvasWrapper = document.querySelector('#canvas-wrapper');
    this.canvas = document.querySelector('canvas')!;
    this.tmp_canvas = document.createElement('canvas')!;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.tmp_canvas.width = this.canvas.width;
    this.tmp_canvas.height = this.canvas.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.tmp_ctx = this.tmp_canvas.getContext('2d')!;
    this.tmp_canvas.id = 'tmp_canvas';
    this.tmp_canvas.classList.add('palet-canvas', 'position-absolute');
    this.tmp_ctx.lineCap = 'round';

    this.tmp_ctx.lineJoin = "round";
    canvasWrapper!.appendChild(this.tmp_canvas);

    this.tmp_canvas.addEventListener('mousedown', (e) => {
      this.tmp_ctx.fillStyle = this.toolMapping[this.tool]['fillColor'] || '#000000';
      this.tmp_ctx.lineWidth = this.lineWidth;
      this.tmp_ctx.setLineDash(this.getLineStyle());
      this.tmp_ctx.strokeStyle = this.toolMapping[this.tool]['lineColor'] || '#000000';
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      this.start_mouse.x = this.mouse.x;
      this.start_mouse.y = this.mouse.y;
      this.tmp_ctx.globalAlpha = this.opacity;
      this.tmp_ctx.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);

      if (this.tool !== 'polygon' && this.tool !== 'arc') {
        this.polygonPoints = [];
        this.arcPoints = [];
        this.tmp_canvas.addEventListener('mousemove', this.toolMapping[this.tool].mouseEvent!, false);
      }

      if (this.tool === 'pencil' || this.tool === 'eraser') {
        this.ppts.push({ x: this.mouse.x , y: this.mouse.y  });
        this.draw_pencil(e);
      }
      
      if (this.tool === 'air') {
        this.ppts.push({ x: this.mouse.x, y: this.mouse.y });
        this.draw_air(e);
      }

      if (this.tool === 'fill') {
        let replacement_color = this.hexToRgba(this.toolMapping[this.tool].fillColor!);
        let rgb = replacement_color;
        let rgb_array = rgb?.replace(/[^\d,]/g, '').split(',');
        let imgd = this.ctx.getImageData(0, 0, this.width, this.height);
        let pix = imgd.data;
        
        let pos = 4 * (this.width * this.mouse.y + this.mouse.x);
        let target_color = `rgba(${pix[pos]},${pix[pos + 1]},${pix[pos + 2]},${pix[pos + 3]})`;

        if (replacement_color !== target_color) {
          let Q = [pos];
          while (Q.length > 0) {
            pos = Q.shift()!;
            if (`rgba(${pix[pos]},${pix[pos + 1]},${pix[pos + 2]},${pix[pos + 3]})` !== target_color)
              continue;

            let left = this.find_left_most_similar_pixel(pix, pos, target_color);
            let right = this.find_right_most_similar_pixel(pix, pos, target_color);
      
            for (let i = left; i <= right; i = i + 4) {
              pix[i] = parseInt(rgb_array[0]);
              pix[i + 1] = parseInt(rgb_array[1]);
              pix[i + 2] = parseInt(rgb_array[2]);
              pix[i + 3] = 255; // not transparent

              let top = i - 4 * this.width;
              let down = i + 4 * this.width;

              if (top >= 0 && (`rgba(${pix[top]},${pix[top + 1]},${pix[top + 2]},${pix[top + 3]})` === target_color))
                Q.push(top);

              if (down < pix.length && `rgba(${pix[down]},${pix[down + 1]},${pix[down + 2]},${pix[down + 3]})` === target_color)
                Q.push(down);
            }
          }
          this.ctx.putImageData(imgd, 0, 0);
        }
      }
    }, false);

    this.tmp_canvas.addEventListener('mouseup', (e) => {
      if (this.tool === 'arc') {
        this.arcPoints.push({ x: this.mouse.x, y: this.mouse.y });
        let length = this.arcPoints.length;
        if (length === 1) {
          this.tmp_ctx.beginPath();
          this.tmp_ctx.moveTo(this.arcPoints[0].x, this.arcPoints[0].y);
          this.tmp_ctx.lineTo(this.arcPoints[0].x, this.arcPoints[0].y);
          this.tmp_ctx.stroke();
          this.tmp_ctx.closePath();
        } else
          if (length === 2) {
            this.tmp_ctx.beginPath();
            this.tmp_ctx.moveTo(this.arcPoints[length - 2].x, this.arcPoints[length - 2].y);
            this.tmp_ctx.lineTo(this.arcPoints[length - 1].x, this.arcPoints[length - 1].y);
            this.tmp_ctx.stroke();
          }
          else
            if (length === 3) {
              this.tmp_ctx.beginPath();
              this.tmp_ctx.moveTo(this.arcPoints[0].x, this.arcPoints[0].y);
              this.tmp_ctx.quadraticCurveTo(this.arcPoints[length - 1].x, this.arcPoints[length - 1].y, this.arcPoints[length - 2].x, this.arcPoints[length - 2].y);
              this.tmp_ctx.stroke();
              this.tmp_ctx.closePath();
              this.arcPoints = [];
              this.ctx.drawImage(this.tmp_canvas, 0, 0);
              this.tmp_ctx.clearRect(0, 0, this.width, this.height);
            }
      }

      if (this.tool === 'polygon') {
        this.polygonPoints.push({ x: this.mouse.x, y: this.mouse.y });
        this.tmp_canvas.addEventListener('dblclick', this.polygon_dblclick);
        let length = this.polygonPoints.length;
        if (length === 1) {

          this.tmp_ctx.beginPath();
          this.tmp_ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
          this.tmp_ctx.lineTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
          this.tmp_ctx.stroke();
          this.tmp_ctx.closePath();
        }
        if (length > 1) {

          this.tmp_ctx.beginPath();
          this.tmp_ctx.moveTo(this.polygonPoints[length - 2].x, this.polygonPoints[length - 2].y);
          this.tmp_ctx.lineTo(this.polygonPoints[length - 1].x, this.polygonPoints[length - 1].y);
          this.tmp_ctx.stroke();
          this.tmp_ctx.closePath();
        }
      }

      this.tmp_canvas.removeEventListener('mousemove', this.toolMapping[this.tool].mouseEvent!, false);
      if (this.tool != 'text' && !(this.arcPoints.length == 2)) {

        this.ctx.drawImage(this.tmp_canvas, 0, 0);
        this.tmp_ctx.clearRect(0, 0, this.width, this.height);

        // Emptying up Pencil Polets
      }
      this.ppts = [];
      if (this.tool === 'eraser') {
        this.ctx.globalCompositeOperation = 'source-over';
      }
    }, false);
  }
  
  polygon_dblclick = () => {
    {
      let length = this.polygonPoints.length;
      if (length > 1) {
        this.tmp_ctx.beginPath();
        this.tmp_ctx.moveTo(this.polygonPoints[length - 1].x, this.polygonPoints[length - 1].y);
        this.tmp_ctx.lineTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        this.tmp_ctx.stroke();
        this.tmp_ctx.closePath();
        this.polygonPoints = [];
        this.ctx.drawImage(this.tmp_canvas, 0, 0);
        this.tmp_ctx.clearRect(0, 0, this.width, this.height);
      }
      this.tmp_canvas.removeEventListener('dblclick', this.polygon_dblclick);
    }
  }

  getLineStyle() {
    if (this.lineStyle === 'dashed') { return [this.lineWidth * 4, this.lineWidth * 3]; }
    if (this.lineStyle === 'dotted') { return [this.lineWidth / 3, this.lineWidth * 2]; }
    return [];
  }

  find_right_most_similar_pixel = (pix:Uint8ClampedArray, pos:number, target_color:string) => {
    let y = Math.floor(pos / (4 * this.width));
    let right = pos;
    let end = (y + 1) * this.width * 4 - 4;
    while (end >= right) {
      if (`rgba(${pix[right + 4]},${pix[right + 5]},${pix[right + 6]},${pix[right + 7]})` === target_color)
        right = right + 4;
      else
        break;
    }
    return right;
  }

  find_left_most_similar_pixel = (pix:Uint8ClampedArray, pos:number, target_color: string)=> {
    let y = Math.floor(pos / (4 * this.width));
    let left = pos;
    let end = y * this.width * 4;
    while (end <= left) {
      if (`rgba(${pix[left - 4]},${pix[left - 3]},${pix[left - 2]},${pix[left - 1]})` === target_color)
        left = left - 4;
      else
        break;
    }
    return left;
  }
  
  zoomin() {
    this.height = 300;
    this.width = 400;
    this.initSetup();
  }
  zoomout() {
    this.height = 600;
    this.width = 800;
    this.initSetup();
  }
  zoomfit() { }

  randomPointInRadius(radius:number) {
    let random_angle = Math.random() * (2 * Math.PI);
    let random_radius = Math.random() * radius;

    // console.log(random_angle, random_radius, Math.cos(random_angle), Math.sin(random_angle));

    return {
      x: Math.cos(random_angle) * random_radius,
      y: Math.sin(random_angle) * random_radius
    };
  }

  draw_pencil = (e:MouseEvent) => {
    this.mouse.x = e.offsetX;
    this.mouse.y = e.offsetY;
    //console.log(mouse.x + " "+mouse.y);
    // Saving all the polets in an array

    this.ppts.push({ x: this.mouse.x, y: this.mouse.y });
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);
    this.tmp_ctx.beginPath();
    this.tmp_ctx.moveTo(this.ppts[0].x, this.ppts[0].y);

    for (let i = 0; i < this.ppts.length; i++)
      this.tmp_ctx.lineTo(this.ppts[i].x, this.ppts[i].y);
    this.tmp_ctx.stroke();

  }

  draw_rectangle = (e:MouseEvent) => {
    this.mouse.x = e.offsetX;
    this.mouse.y = e.offsetY;
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.width, this.height);
    this.tmp_ctx.beginPath();
    this.tmp_ctx.moveTo(this.start_mouse.x, this.start_mouse.y);
    let x = Math.min(this.mouse.x, this.start_mouse.x);
    let y = Math.min(this.mouse.y, this.start_mouse.y);
    let width = Math.abs(this.mouse.x - this.start_mouse.x);
    let height = Math.abs(this.mouse.y - this.start_mouse.y);
    this.tmp_ctx.strokeRect(x, y, width, height);
    this.tmp_ctx.closePath();
  }

  draw_circle = (e:MouseEvent) => {
    this.mouse.x = e.offsetX ;
    this.mouse.y = e.offsetY ;
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);

    //let radius = Math.max(Math.abs(mouse.x - start_mouse.x), Math.abs(mouse.y - start_mouse.y)) / 2;
    let a = (this.mouse.x - this.start_mouse.x) / 2;
    let b = (this.mouse.y - this.start_mouse.y) / 2;
    let r = Math.sqrt(a * a + b * b);

    this.tmp_ctx.beginPath();
    //tmp_ctx.arc(x, y, radius, 0, Math.PI*2, false);
    this.tmp_ctx.arc((this.mouse.x + this.start_mouse.x) / 2, (this.mouse.y + this.start_mouse.y) / 2, r, 0, 2 * Math.PI);
    // tmp_ctx.arc(x, y, 5, 0, Math.PI*2, false);
    this.tmp_ctx.stroke();
    this.tmp_ctx.closePath();
  }

  draw_ellipse = (e:MouseEvent) => {
    this.mouse.x =  e.offsetX;
    this.mouse.y =  e.offsetY;
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);

    let x = this.start_mouse.x;
    let y = this.start_mouse.y;
    let w = (this.mouse.x - x);
    let h = (this.mouse.y - y);

    this.tmp_ctx.save(); // save state
    this.tmp_ctx.beginPath();

    this.tmp_ctx.translate(x, y);
    this.tmp_ctx.scale(w / 2, h / 2);
    this.tmp_ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

    this.tmp_ctx.restore(); // restore to original state
    this.tmp_ctx.stroke();
    this.tmp_ctx.closePath();
  }

  hexToRgba(hex:string) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      let a = parseInt(c.join(''), 16); 
      return 'rgba(' + [(a >> 16) & 255, (a >> 8) & 255, a & 255].join(',') + ',1)';
    }else {
      return 'rgba(255,255,255,1)';
    }
  }

  draw_air = (e: MouseEvent) => {

    this.mouse.x = e.offsetX ;
    this.mouse.y = e.offsetY ;
    // Tmp canvas is always cleared up before drawing.
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.width, this.height);

    this.ppts.push({ x: this.mouse.x, y: this.mouse.y });

    this.tmp_ctx.beginPath();
    this.tmp_ctx.moveTo(this.ppts[0].x, this.ppts[0].y);

    for (let j = 0; j < this.ppts.length; j++) {
      this.spray(this.ppts[j].x, this.ppts[j].y)
    }
  }

  spray(x:number, y:number) {
    for (let i = 0; i < this.density; i++) {
      let offset = this.randomPointInRadius(this.lineWidth);

      let xs = x + offset.x;
      let ys = y + offset.y;

      this.tmp_ctx.fillRect(xs, ys, 1, 1);
    }
  }

  draw_line = (e: MouseEvent) => {

    this.mouse.x = e.offsetX;
    this.mouse.y = e.offsetY;
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.width, this.height);

    this.tmp_ctx.beginPath();
    this.tmp_ctx.moveTo(this.start_mouse.x, this.start_mouse.y);
    this.tmp_ctx.lineTo(this.mouse.x, this.mouse.y);
    this.tmp_ctx.stroke();
    this.tmp_ctx.closePath();
  }

  resetPage() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  formatLabel(value: number) {
    this.opacity = value;
    return this.opacity;
  }

  formatWeight(value: number) {
    this.lineWidth = value;
    return this.lineWidth;
  }

  elt(name:string, attributes: {[key:string]:string}, text:string) {
    let node = document.createElement(name);
    if (attributes) {
      for (let attr in attributes)
        if (attributes.hasOwnProperty(attr))
          node.setAttribute(attr, attributes[attr]);
    }
    let child = document.createTextNode(text);
    node.appendChild(child);
    return node as HTMLAnchorElement;
  }

  save() {
    let link = this.elt('a', { href: '/', target: '_blank', download: 'lamhey-image.png' }, 'Save');
    let canvas = document.querySelector('canvas');
    try {
      link.href = canvas!.toDataURL('image/png');
    } catch (e) {
      console.log("Can't save");
    }
    link.click();
  };

  move_eraser = (e:MouseEvent) => {
    this.mouse.x = e.offsetX ;
    this.mouse.y = e.offsetY ;
    //console.log(mouse.x + " "+mouse.y);
    // Saving all the polets in an array
    this.ppts.push({ x: this.mouse.x, y: this.mouse.y })
    // Tmp canvas is always cleared up before drawing.
    this.tmp_ctx.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);
    this.tmp_ctx.strokeStyle = 'rgba(255,255,255,1)';
    this.tmp_ctx.fillStyle = 'rgba(0,0,0,1)';
    this.tmp_ctx.beginPath();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.tmp_ctx.moveTo(this.ppts[0].x, this.ppts[0].y);
    for (let i = 0; i < this.ppts.length; i++)
      this.tmp_ctx.lineTo(this.ppts[i].x, this.ppts[i].y);
    this.tmp_ctx.stroke();
  }

  getColor(event:Event) {
    const color = (event.target as HTMLInputElement).getAttribute("data-color");
    if (this.tool === 'fill' || this.tool === 'air') {
      this.toolMapping[this.tool].fillColor = color||'#000000';
    }
    this.toolMapping[this.tool].lineColor = color||'#000000';
  }

  toolMapping: { [key: string]: { mouseEvent?:(e:MouseEvent)=>void, fillColor?: string, lineColor?: string }} = {
    'rectangle': { 'mouseEvent': this.draw_rectangle, 'fillColor': '#ffffff', 'lineColor': '#ff0000' },
    'circle': { 'mouseEvent': this.draw_circle, 'fillColor': '#ffffff', 'lineColor': '#ff0000' },
    'ellipse': { 'mouseEvent': this.draw_ellipse, 'fillColor': '#ffffff', 'lineColor': '#ff0000' },
    'pencil': { 'mouseEvent': this.draw_pencil, 'lineColor': '#ff0000' },
    'line': { 'mouseEvent': this.draw_line, 'lineColor': '#ff0000' },
    'air': { 'mouseEvent': this.draw_air, 'fillColor': '#ff0000', 'lineColor': '#ff0000' },
    'polygon': { 'mouseEvent': this.draw_line, 'lineColor': '#ff0000' },
    'arc': { 'mouseEvent': this.draw_line, 'lineColor': '#ff0000' },
    'eraser': { 'mouseEvent': this.move_eraser, 'lineColor': '#ffffff' },
    'fill': { 'fillColor': '#ff00ff' },
  }
}

