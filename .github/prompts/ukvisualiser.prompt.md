Scaffold a basic React + R3F app


Claude prompt:

“Replace the placeholder sphere with an Earth-textured sphere using SphereGeometry and MeshStandardMaterial in R3F. Load a public earth texture URL, add ambient + directional light, and set the camera so the globe fills the viewport.”

Why: Shopify’s globe starts with a textured sphere before adding effects .

Add order “arcs” with instancing

Understand the technique: each arc is a Bézier curve with four control points (P0–P3) and animated via a shader. To render tens of thousands optimally, Shopify switched to GPU instancing .

Claude prompt:

“Create an InstancedMesh in R3F that takes instanced attributes for P0, P1, P2, P3 (each a vec3) and startTime (float). Write a vertex shader that interpolates along the Bézier curve using the instance UV and uTime uniform, and offset vertices to always face the camera.”

Integrate the resulting component into your globe scene.

Implement city dots (instanced points)

Technique: Shopify chose gl.POINTS for a glowing horizon effect .

Claude prompt:

“Generate a R3F component that renders instanced points on the sphere surface. Each instance has a position and size attribute. Use a custom shader or PointMaterial so points glow softly at night.”

Hook up sample data—e.g., 50 random cities—to see the effect.

Layer on special effects (fireworks & pins)

Fireworks: built from an IcosahedronGeometry with triangle strips animated in the shader and a bloom post-processing pass for glow .

Claude prompt:

“Generate a R3F component that creates fireworks: instantiate an icosahedron mesh, expand triangles outwards over time in the vertex shader, and fade via a noise function.”

Animated pins: Shopify uses react-spring for entrance easing .

Claude prompt:

“Write a pin component that springs out from the globe surface when mounted, using useSpring and a.mesh from @react-spring/three.”

Add camera fly-to and extra flourishes

Camera interpolation: spherical lerp between two spherical coords, updating camera.position and camera.up each frame to avoid flipping near antipodes .

Claude prompt:

“Provide a hook called useFlyTo(targetPosition) that computes spherical interpolation from the current camera position to targetPosition over 2 seconds, updating camera.up to prevent flips.”

Airplanes & loops: similar instancing tricks and custom shaders for orbital motion and Hermite-spline loops .