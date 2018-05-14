
var main=function() {

  var CANVAS=document.getElementById("your_canvas");

  CANVAS.width=CANVAS.height=Math.min(window.innerWidth, window.innerHeight);
  var GL = CANVAS.getContext("webgl", {antialias: false, alpha: false});

  var POINTER_X=0.5, POINTER_Y=0.5;

  var mouseMove=function(event) {
    POINTER_X=(event.clientX-CANVAS.offsetLeft)/CANVAS.width;
    POINTER_Y=1-event.clientY/CANVAS.height;
  };
  CANVAS.addEventListener("mousemove", mouseMove, false);
  SOURCEFLOW=0;
  CANVAS.addEventListener("mouseout", function() { SOURCEFLOW = 0; } , false);


  CANVAS.addEventListener("mouseenter", function() { SOURCEFLOW = 4; } , false);

  //enable texture float
  var EXT_FLOAT = GL.getExtension('OES_texture_float') ||
    GL.getExtension('MOZ_OES_texture_float') ||
      GL.getExtension('WEBKIT_OES_texture_float');

  /*========================= PARAMETERS ========================= */

  var SIMUSIZEPX=512; //GPGPU simulation texture size in pixel
  var SIMUWIDTH=2;    //Simulation size in meters
  var GPGPU_NPASS=3; //number of GPGPU pass per rendering
  var WATER_DEEP=0.01;          //mean height of water in meters
  var RENDERING_FLOOR_SIZE=0.5; //size of the water floor texture in meters

  /*========================= RENDERING SHADERS ========================= */
  /*jshint multistr: true */
  var vertSrc_render="\n\
attribute vec2 position;\n\
\n\
varying vec2 vUV;\n\
\n\
void main(void) {\n\
gl_Position = vec4(position, 0., 1.);\n\
vUV=0.5*(position+vec2(1.,1.));\n\
}";

function done()
{
    var fileContents = this.response;
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
var done = false;
var fragSrc_render = "---";
var xmlhttp;
xmlhttp=new XMLHttpRequest();
xmlhttp.open("GET","render.c",true);

xmlhttp.onreadystatechange = function() {
    // console.log(Date.now());
    // console.log(xmlhttp.responseText);
    fragSrc_render = xmlhttp.responseText;
}

xmlhttp.send(null);
var x = xmlhttp.responseText;
console.log(x);

async function update(){
  console.log(Date.now());
  await sleep(3000);
  // console.log(Date.now());
  // var fragSrc_render = x;
  // console.log(xmlhttp.responseText);
  // console.log(fragSrc_render);
  done = true;
}
update();

var fragSrc_water= "";
xmlhttp=new XMLHttpRequest();
xmlhttp.open("GET","water.c",true);

xmlhttp.onreadystatechange = function() {
    // console.log(Date.now());
    // console.log(xmlhttp.responseText);
    fragSrc_water = xmlhttp.responseText;
}

xmlhttp.send(null);


var fragSrc_normal= "";
xmlhttp=new XMLHttpRequest();
xmlhttp.open("GET","normal.c",true);

xmlhttp.onreadystatechange = function() {
    // console.log(Date.now());
    // console.log(xmlhttp.responseText);
    fragSrc_normals = xmlhttp.responseText;
}

  //compile a shader :
  var get_shader=function(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert("ERROR IN "+typeString+ " SHADER : " + GL.getShaderInfoLog(shader));
      return false;
    }
    return shader;
  };

  //build a shader program :
  var get_shaderProgram=function(vertex_source, fragment_source, typeStr){
    var shader_vertex=get_shader(vertex_source, GL.VERTEX_SHADER, typeStr+" VERTEX");
    var shader_fragment=get_shader(fragment_source, GL.FRAGMENT_SHADER, typeStr+" FRAGMENT");

    var shader_program=GL.createProgram();
    GL.attachShader(shader_program, shader_vertex);
    GL.attachShader(shader_program, shader_fragment);

    GL.linkProgram(shader_program);
    return shader_program;
  };


  //final rendering shader program
  var SHP_VARS={};
  console.log("bro!!!");
  console.log(Date.now());
    update();
  var SHP_RENDERING=get_shaderProgram(vertSrc_render, fragSrc_render, "RENDER");

  SHP_VARS.rendering={
    H: GL.getUniformLocation(SHP_RENDERING, "H"),
    L: GL.getUniformLocation(SHP_RENDERING, "L"),
    l: GL.getUniformLocation(SHP_RENDERING, "l"),
    sampler: GL.getUniformLocation(SHP_RENDERING, "sampler"),
    sampler_normals: GL.getUniformLocation(SHP_RENDERING, "sampler_normals"),
    position: GL.getAttribLocation(SHP_RENDERING, "position")
  };
  var SHP_WATER=get_shaderProgram(vertSrc_render, fragSrc_water, "WATER");

  SHP_VARS.water={
    dt: GL.getUniformLocation(SHP_WATER, "dt"),
    H: GL.getUniformLocation(SHP_WATER, "H"),
    b: GL.getUniformLocation(SHP_WATER, "b"),
    g: GL.getUniformLocation(SHP_WATER, "g"),
    mouse: GL.getUniformLocation(SHP_WATER, "mouse"),
    sourceFlow: GL.getUniformLocation(SHP_WATER, "sourceFlow"),
    sourceRadius: GL.getUniformLocation(SHP_WATER, "sourceRadius"),

    epsilon: GL.getUniformLocation(SHP_WATER, "epsilon"),
    scale: GL.getUniformLocation(SHP_WATER, "scale"),

    sampler_water: GL.getUniformLocation(SHP_WATER, "sampler_water"),
    sampler_normals : GL.getUniformLocation(SHP_WATER, "sampler_normals"),

    position: GL.getAttribLocation(SHP_WATER, "position")
  };

  var SHP_COPY=get_shaderProgram(vertSrc_render, fragSrc_copy, "COPY");

  SHP_VARS.copy={
    scale : GL.getUniformLocation(SHP_COPY, "scale"),
    sampler: GL.getUniformLocation(SHP_COPY, "sampler"),
    position: GL.getAttribLocation(SHP_COPY, "position")
  };
  var SHP_NORMALS=get_shaderProgram(vertSrc_render, fragSrc_normals, "NORMALS");

  SHP_VARS.normals={
    sampler: GL.getUniformLocation(SHP_NORMALS, "sampler"),
    scale: GL.getUniformLocation(SHP_NORMALS, "scale"),
    epsilon: GL.getUniformLocation(SHP_NORMALS, "epsilon"),
    position: GL.getAttribLocation(SHP_NORMALS, "position")
  };


  /*========================= THE QUAD ========================= */
  //POINTS :
  var quad_vertex=[
    -1,-1, //first corner: -> bottom left of the viewport
    1,-1,  //bottom right
    1,1,   //top right
    -1,1   //top left
  ];

  var QUAD_VERTEX= GL.createBuffer ();
  GL.bindBuffer(GL.ARRAY_BUFFER, QUAD_VERTEX);
  GL.bufferData(GL.ARRAY_BUFFER,new Float32Array(quad_vertex),GL.STATIC_DRAW);

  //FACES :
  var quad_faces = [0,1,2, 0,2,3];
  var QUAD_FACES= GL.createBuffer ();
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, QUAD_FACES);
  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]),GL.STATIC_DRAW);


  /*========================= THE TEXTURE ========================= */

  var renderingImage=new Image();
  renderingImage.src='texas.jpg';
  var renderingTexture=GL.createTexture();
  GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
  GL.bindTexture(GL.TEXTURE_2D, renderingTexture);

  renderingImage.onload=function() {
    GL.bindTexture(GL.TEXTURE_2D, renderingTexture);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, renderingImage);
  };

  /*====================== RENDER TO TEXTURE ====================== */

  //GPGPU WATER RTT :
  var fb_water=GL.createFramebuffer();
  GL.bindFramebuffer(GL.FRAMEBUFFER, fb_water);

  var texture_water=GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, texture_water);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE );
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE );
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, SIMUSIZEPX, SIMUSIZEPX, 0, GL.RGBA, GL.FLOAT, null);

  GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, texture_water, 0);

  //COPY RTT :
  var fb_copy=GL.createFramebuffer();
  GL.bindFramebuffer(GL.FRAMEBUFFER, fb_copy);

  var texture_water_copy=GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, texture_water_copy);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE );
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE );
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, SIMUSIZEPX, SIMUSIZEPX, 0, GL.RGBA, GL.FLOAT, null);
  GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, texture_water_copy, 0);

  //NORMALS RTT :
  var fb_normals=GL.createFramebuffer();
  GL.bindFramebuffer(GL.FRAMEBUFFER, fb_normals);

  var texture_normals=GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, texture_normals);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE );
  GL.texParameteri( GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE );
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, SIMUSIZEPX, SIMUSIZEPX, 0, GL.RGBA, GL.FLOAT, null);
  GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, texture_normals, 0);


  /*========================= INIT ========================= */

  //WEBGL GENERAL INIT
  GL.disable(GL.DEPTH_TEST);
  GL.disable(GL.SCISSOR_TEST);
  GL.clearColor(0.0, 0.0, 0.0, 0.0);


  //SHADER PROGRAM RENDERING INIT
  GL.useProgram(SHP_RENDERING);
  GL.enableVertexAttribArray(SHP_VARS.rendering.position);
  GL.uniform1f(SHP_VARS.rendering.H, WATER_DEEP);
  GL.uniform1f(SHP_VARS.rendering.L, SIMUWIDTH);
  GL.uniform1f(SHP_VARS.rendering.l, RENDERING_FLOOR_SIZE);
  GL.uniform1i(SHP_VARS.rendering.sampler, 0);
  GL.uniform1i(SHP_VARS.rendering.sampler_normals, 1);
  GL.bindBuffer(GL.ARRAY_BUFFER, QUAD_VERTEX);
  GL.vertexAttribPointer(SHP_VARS.rendering.position, 2, GL.FLOAT, false,8,0) ;
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, QUAD_FACES);
  GL.disableVertexAttribArray(SHP_VARS.rendering.position);


  //SHADER PROGRAM GPGPU WATER INIT
  GL.useProgram(SHP_WATER);
  GL.uniform1i(SHP_VARS.water.sampler_water, 0);
  GL.uniform1i(SHP_VARS.water.sampler_normals, 1);

  //WE SIMULATE A SQUARE WATER SURFACE SIDE MEASURING 2 METERS
  GL.uniform1f(SHP_VARS.water.g, -9.8);       //gravity acceleration
  GL.uniform1f(SHP_VARS.water.H, WATER_DEEP);  //mean height of water in meters
  GL.uniform1f(SHP_VARS.water.b, 0.001);       //viscous drag coefficient
  GL.uniform1f(SHP_VARS.water.epsilon, 1/SIMUSIZEPX); //used to compute space derivatives
  GL.uniform1f(SHP_VARS.water.scale, SIMUWIDTH/SIMUSIZEPX);

  GL.uniform1f(SHP_VARS.water.sourceRadius, 0.04); //percentage of the surface which is flowed by the source

  GL.enableVertexAttribArray(SHP_VARS.water.position);
  GL.bindBuffer(GL.ARRAY_BUFFER, QUAD_VERTEX);
  GL.vertexAttribPointer(SHP_VARS.water.position, 2, GL.FLOAT, false,8,0) ;
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, QUAD_FACES);
  GL.disableVertexAttribArray(SHP_VARS.water.position);


  //SHADER PROGRAM TEXTURE COPY INIT
  GL.useProgram(SHP_COPY);
  GL.uniform1f(SHP_VARS.copy.scale, SIMUSIZEPX);
  GL.uniform1i(SHP_VARS.copy.sampler, 0);
  GL.enableVertexAttribArray(SHP_VARS.copy.position);
  GL.bindBuffer(GL.ARRAY_BUFFER, QUAD_VERTEX);
  GL.vertexAttribPointer(SHP_VARS.copy.position, 2, GL.FLOAT, false,8,0) ;
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, QUAD_FACES);
  GL.disableVertexAttribArray(SHP_VARS.copy.position);


  //SHADER PROGRAM NORMALS INIT
  GL.useProgram(SHP_NORMALS);
  GL.uniform1i(SHP_VARS.normals.sampler, 0);
  GL.uniform1f(SHP_VARS.normals.epsilon, 1/SIMUSIZEPX); //used to compute space derivatives
  GL.uniform1f(SHP_VARS.normals.scale, SIMUWIDTH);

  GL.enableVertexAttribArray(SHP_VARS.normals.position);
  GL.bindBuffer(GL.ARRAY_BUFFER, QUAD_VERTEX);
  GL.vertexAttribPointer(SHP_VARS.normals.position, 2, GL.FLOAT, false,8,0) ;
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, QUAD_FACES);
  GL.disableVertexAttribArray(SHP_VARS.normals.position);

  /*========================= RENDER LOOP ========================= */
  var old_timestamp=0;
  var animate=function(timestamp) {
    var dt=(timestamp-old_timestamp)/1000; //time step in seconds;
    dt=Math.min(Math.abs(dt), 0.017);
    old_timestamp=timestamp;

    GL.clear(GL.COLOR_BUFFER_BIT);


    for (var i=0; i<GPGPU_NPASS; i++) {

      //COPY
      GL.bindFramebuffer(GL.FRAMEBUFFER, fb_copy);
      GL.useProgram(SHP_COPY);
      GL.viewport(0.0, 0.0, SIMUSIZEPX, SIMUSIZEPX);
      GL.enableVertexAttribArray(SHP_VARS.copy.position);
      GL.bindTexture(GL.TEXTURE_2D, texture_water);
      GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
      GL.disableVertexAttribArray(SHP_VARS.copy.position);

      //GPGPU PHYSICAL SIMULATION :
      GL.bindFramebuffer(GL.FRAMEBUFFER, fb_water);
      GL.useProgram(SHP_WATER);
      GL.enableVertexAttribArray(SHP_VARS.water.position);
      GL.activeTexture(GL.TEXTURE1);
      GL.bindTexture(GL.TEXTURE_2D, texture_normals);
      GL.activeTexture(GL.TEXTURE0);
      GL.bindTexture(GL.TEXTURE_2D, texture_water_copy);
      if (!i) {
        GL.uniform2f(SHP_VARS.water.mouse, POINTER_X, POINTER_Y);
        GL.uniform1f(SHP_VARS.water.sourceFlow, SOURCEFLOW);
        GL.uniform1f(SHP_VARS.water.dt, dt/GPGPU_NPASS);
      }
      GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
      GL.disableVertexAttribArray(SHP_VARS.water.position);

      //NORMALS :
      GL.bindFramebuffer(GL.FRAMEBUFFER, fb_normals);
      GL.useProgram(SHP_NORMALS);
      GL.enableVertexAttribArray(SHP_VARS.normals.position);
      GL.bindTexture(GL.TEXTURE_2D, texture_water);
      GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
      GL.disableVertexAttribArray(SHP_VARS.normals.position);

    } //end for GPGPU_NPASS


    //RENDERING :
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    GL.useProgram(SHP_RENDERING);
    GL.enableVertexAttribArray(SHP_VARS.rendering.position);
    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.activeTexture(GL.TEXTURE1);
    GL.bindTexture(GL.TEXTURE_2D, texture_normals);
    GL.activeTexture(GL.TEXTURE0);
    GL.bindTexture(GL.TEXTURE_2D, renderingTexture);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
    GL.disableVertexAttribArray(SHP_VARS.rendering.position);

    GL.flush();
    window.requestAnimationFrame(animate);
  };

  animate(new Date().getTime());
};
