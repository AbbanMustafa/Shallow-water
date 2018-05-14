precision highp float;

uniform float dt, H, b, g, epsilon;
uniform float scale;
uniform vec2 mouse;

uniform float sourceRadius, sourceFlow;
uniform sampler2D sampler_water, sampler_normals;

varying vec2 vUV;

void main(void) {

vec4 water_t  = texture2D(sampler_water, vUV);
float h       = water_t.r;
vec2 uvSpeed  = water_t.gb;

vec2 dx=vec2(epsilon, 0.);
vec2 dy=vec2(0., epsilon);
float du_dx=(texture2D(sampler_water, vUV+dx).g-texture2D(sampler_water, vUV-dx).g)/(2.*scale);
float dv_dy=(texture2D(sampler_water, vUV+dy).b-texture2D(sampler_water, vUV-dy).b)/(2.*scale);

vec3 normals=texture2D(sampler_normals,vUV).xyz;

//we add 1 to Nz because RGB = (0,0,0) -> Normal = (0,0,1)
vec2 d_uvSpeed = -dt * (g * normals.xy/(normals.z+1.) + b*uvSpeed);

float d_h = -dt * H * (du_dx + dv_dy);

float dSource = length(vUV-mouse);

d_h += dt * sourceFlow * (1. - smoothstep(0., sourceRadius, dSource));
gl_FragColor = vec4(h+d_h, uvSpeed+d_uvSpeed, 1.);
}";