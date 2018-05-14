precision highp float;

uniform sampler2D sampler;
uniform float epsilon, scale; //horizontal scale in meters
varying vec2 vUV;

vec3 getPoint(float x, float y, vec2 uv){
float h = texture2D(sampler, uv+vec2(x,y)).r; //water height
return vec3(x*scale,y*scale,h);
}

void main(void) {
vec3 points[4];
points[0]=getPoint(-epsilon,0., vUV);
points[1]=getPoint(0.,-epsilon, vUV);
points[2]=getPoint(epsilon ,0., vUV);
points[3]=getPoint(0. ,epsilon, vUV);

vec3 normal=normalize(cross(points[1]-points[3], points[2]-points[0]));

//We substract 1 to Nz because Normal = (0,0,1) -> RGB = (0,0,0)
normal.z-=1.;

float height=texture2D(sampler, vUV).r;
gl_FragColor=vec4(normal, height);
}";
