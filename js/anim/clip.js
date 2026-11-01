// Small dependency-free keyframe sampler. Values interpolate with smoothstep.
export function sample(keys,t){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){const [b,y]=keys[i],[a,x]=keys[i-1];if(t<=b){let u=(t-a)/(b-a);u=u*u*(3-2*u);return x+(y-x)*u;}}return keys.at(-1)[1];}
