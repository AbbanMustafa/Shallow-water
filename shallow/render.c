
precision highp float;

uniform float H; //water deep (meters)
uniform float L; //simulation size (meters)
uniform float l; //ground texture tile size (meters)
uniform sampler2D sampler;
uniform sampler2D sampler_normals;

varying vec2 vUV;

const vec3 light=vec3(1.,1.,1.);
const vec4 color_sky=vec4(60./255., 90./255., 150./255., 1.);
const float n=1./1.33;

void main(void) {
	vec4 water=texture2D(sampler_normals, vUV);
	vec3 water_normal=water.rgb+vec3(0.,0.,1.);
	float water_height=water.a;

	vec3 I=vec3(0.,0.,1.);               //incident vector
	vec3 R = refract(I, water_normal, n); //refracted vector

	float k=(water_height+H)/R.z;         //k so that M=kR belongs to the water floor
	vec3 M=k*R;                           //belongs to the water floor
	vec2 uv=(vUV*L-M.xy)/l;               //texture coordinates of the water floor
	vec4 color_floor=texture2D(sampler, uv);

	float F=water_normal.z; //Fresnel reflexion coefficient = (I.N)

	vec4 color=mix(color_sky, color_floor, 0.6+F*0.3);

	vec3 lightDir=normalize(light-vec3(L*(vUV-vec2(0.5,0.5)), water_height));

	float lightPow=clamp(pow(dot(lightDir, water_normal),4.),1., 1.3);

	gl_FragColor=lightPow*color;
}
