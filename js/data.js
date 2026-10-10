// ============================================================
// SITE CONTENT: edit this file to change the text on the page.
// Facts here are kept to well-known public ones (engine size,
// years). KESTREL is a made-up brand: no real company or models.
// ============================================================

window.SITE = {
  // Words in the marquee band
  marquee: ["K6", "K10", "Hyper", "Strike", "Dirt", "Drift", "Trek"],

  // Lineup cards. family must be one of: sport, street, offroad, cruise
  // color is the paint of the drawn bike; rim is the wheel accent.
  models: [
    {
      name: "Kestrel K6",
      family: "sport",
      tag: "Supersport",
      engine: "636 cc inline-four",
      text: "The middleweight supersport. It’s the bike in 3D at the top of this page: explore its parts or ride it.",
      color: "#ff6b1a",
      rim: "#0b0c0a",
    },
    {
      name: "Kestrel K10",
      family: "sport",
      tag: "Superbike",
      engine: "998 cc inline-four",
      text: "The big superbike: a litre-class four built for the racetrack first.",
      color: "#1f6fe0",
      rim: "#0b0c0a",
    },
    {
      name: "Kestrel Hyper",
      family: "sport",
      tag: "Hypersport",
      engine: "998 cc supercharged inline-four",
      text: "A supercharged street bike. A supercharger squeezes extra air into the engine.",
      color: "#c9ccd0",
      rim: "#7b4dff",
    },
    {
      name: "Kestrel Strike 900",
      family: "street",
      tag: "Naked",
      engine: "948 cc inline-four",
      text: "A naked streetfighter: no fairing, wide bars, upright seat.",
      color: "#15171a",
      rim: "#ff3d8b",
    },
    {
      name: "Kestrel Dirt 450",
      family: "offroad",
      tag: "Motocross",
      engine: "449 cc single",
      text: "A motocross racer built for the gate drop and the first turn.",
      color: "#ffc21a",
      rim: "#0b0c0a",
    },
    {
      name: "Kestrel Drift 650",
      family: "cruise",
      tag: "Cruiser",
      engine: "649 cc parallel twin",
      text: "A low cruiser with a relaxed reach to the bars and pegs.",
      color: "#00a693",
      rim: "#0b0c0a",
    },
  ],

  // Heritage road. The bike passes each one as you scroll.
  milestones: [
    { year: "1958", title: "A shed and a lathe", text: "Two friends start KESTREL fixing scooters in a rented shed." },
    { year: "1972", title: "The first four", text: "Their first inline-four road bike. Four cylinders, four pipes, one big grin." },
    { year: "1984", title: "Wrapped in a fairing", text: "The first fully faired KESTREL sport bike. The K name starts here." },
    { year: "2015", title: "Hyper", text: "A supercharged road bike joins the line." },
  ],

  // 3D model. Drop a .glb (or an unpacked glTF with scene.gltf) in assets/models/.
  // The first path that loads wins; if none load, the hand-built bike is used.
  // rotateY turns the model (radians) if it faces the wrong way.
  // credit: fill in { title, author, url, license, licenseUrl } if the model's licence asks for it (e.g. CC BY).
  model: {
    paths: ["assets/models/bike.glb", "assets/models/scene.gltf"],
    rotateY: 0,
    credit: null,
  },

  // Explore mode. General descriptions only, no performance figures.
  // anchor: where the numbered dot sits (bike space: x = front, y = up, z = right side)
  // explode: how far the part moves in the exploded view
  parts: [
    { id: "intake", name: "Ram air intake", anchor: [1.98, 1.26, 0], explode: [0.9, 0.5, 0],
      text: "The opening in the nose. As speed rises, it pushes cool air into the airbox, so the engine can breathe harder." },
    { id: "fairing", name: "Fairing and bodywork", anchor: [0.45, 1.5, 0.3], explode: [0.15, 1.2, 0],
      text: "The shell around the bike. It slices through the air, shelters the rider and guides airflow to the radiator." },
    { id: "cockpit", name: "Cockpit and clip-ons", anchor: [1.15, 1.62, 0.3], explode: [0.4, 1.5, 0],
      text: "Low clip-on bars, the instruments and the switches. The low bars fold the rider into a tucked racing crouch." },
    { id: "engine", name: "Inline-four engine", anchor: [0.35, 0.75, 0.3], explode: [0, 0, 1.5],
      text: "A liquid-cooled 636 cc four-cylinder. Four small pistons spin up fast, which gives the K6 its high-revving scream." },
    { id: "frame", name: "Aluminium frame", anchor: [0.3, 1.2, -0.25], explode: [0, 0.3, -1.4],
      text: "A stiff, light aluminium perimeter frame. It wraps around the engine and ties the steering head to the swingarm pivot." },
    { id: "front-suspension", name: "Front fork", anchor: [1.3, 1.05, 0.2], explode: [0.9, 0.4, 0],
      text: "An upside-down fork: the thick tubes sit at the top for stiffness. It soaks up bumps and holds the front steady under hard braking." },
    { id: "brakes", name: "Brakes", anchor: [1.45, 0.6, 0.3], explode: [1.4, 0, 0.7],
      text: "Two discs up front with radial-mount calipers, one at the back. Most stopping force comes from the front, so it gets two." },
    { id: "rear-suspension", name: "Swingarm and rear shock", anchor: [-0.8, 0.72, 0.25], explode: [-0.6, -0.1, -1.0],
      text: "The swingarm holds the rear wheel. A single shock with a linkage keeps the tyre pressed to the road." },
    { id: "exhaust", name: "Exhaust", anchor: [-0.75, 0.68, 0.32], explode: [-0.3, -0.2, 2.4],
      text: "Gathers the gases from all four cylinders and calms them in the silencer. Its pipe lengths also shape how the power arrives." },
    { id: "wheels", name: "Wheels and tyres", anchor: [-1.42, 0.6, 0.3], explode: [-1.3, 0, 0],
      text: "Light cast wheels with sticky sport tyres. Less weight in the wheels means quicker, lighter steering." },
    { id: "chain", name: "Chain and sprockets", anchor: [-0.8, 0.62, -0.27], explode: [-0.2, -0.3, -1.3],
      text: "A small sprocket on the engine pulls a chain loop that turns a big sprocket on the rear wheel. Simple, light and efficient." },
  ],

  // "On the lift" scroll tour. part = an id from parts above.
  // view: direction the camera looks from (bike space, x = front, z = right side); zoom: distance, smaller = closer;
  // xray: fade the bodywork so a part hidden under it shows; focus: aim here (bike space) instead of the part's dot.
  lift: {
    title: "On the lift.",
    lede: "Scroll and the bike goes up on the lift. Eight stops, eight parts: how each one works and why it matters.",
    steps: [
      { part: "engine", view: [0.35, 0.2, 0.92], zoom: 0.72, xray: true,
        title: "The engine: four small hearts",
        text: "Four cylinders sit side by side across the frame. Each one pulls in air and fuel, squeezes it, then a spark sets it off. The bang shoves a piston down and spins the crankshaft. Small pistons can spin very fast, which is why this engine loves to rev.",
        tip: "Check the oil with the bike upright on level ground, not leaning on its side stand." },
      { part: "frame", view: [0.2, 0.75, 0.65], zoom: 0.85, xray: true,
        title: "The frame: the backbone",
        text: "Everything bolts to the frame: engine, fork, swingarm, seat. This one is made of two aluminium beams that wrap around the engine. Stiff where it needs to be, light everywhere else, so the bike goes exactly where you point it.",
        tip: "After a fall, have the frame checked. A bent one can make the bike pull to one side." },
      { part: "front-suspension", view: [0.75, 0.2, 0.62], zoom: 0.65,
        title: "The front fork: steer and soak",
        text: "The fork holds the front wheel and lets it move up and down over bumps. Inside each leg, a spring carries the weight and oil slows the movement, so the bike doesn't bounce. When you brake hard the fork dips; good damping keeps it calm.",
        tip: "Wipe the shiny fork tubes clean. Grit on them wears the seals and causes oil leaks." },
      { part: "brakes", view: [0.55, 0.1, 0.83], zoom: 0.55,
        title: "The brakes: speed into heat",
        text: "Squeeze the lever and fluid pushes pads against a spinning disc. Friction turns your speed into heat. Braking shifts the weight forward onto the front tyre, so the front does most of the stopping. That's why it gets two discs.",
        tip: "Brake fluid slowly soaks up water. Change it when the owner's manual says to." },
      { part: "rear-suspension", view: [-0.45, 0.25, 0.86], zoom: 0.7, xray: true,
        title: "Swingarm and shock: rear grip",
        text: "The swingarm is a hinged arm that holds the rear wheel. One shock, linked to it by small levers, controls how it moves. Its job is to keep the rear tyre pressed to the road, so the engine's push becomes forward motion.",
        tip: "Have the shock set for your weight. Too soft and it wallows, too hard and it skips over bumps." },
      { part: "exhaust", view: [-0.3, 0.15, 0.94], zoom: 0.7,
        title: "The exhaust: breathing out",
        text: "Burnt gases leave each cylinder through its own pipe. The pipes merge, then the silencer calms the noise. The length and shape of the pipes help the engine breathe out, which changes how the power builds as it revs.",
        tip: "Pipes get very hot. Let the bike cool before you touch them or cover it." },
      { part: "wheels", view: [0.05, 0.2, 0.98], zoom: 0.95, focus: [0.05, 0.75, 0],
        title: "Wheels and tyres: all the grip",
        text: "All the grip comes from two patches of rubber, each about the size of your palm. Sport tyres use soft rubber that grips best once it's warm. Light wheels make the bike quicker to steer and easier to stop.",
        tip: "Check tyre pressure cold, before you ride. Low pressure makes steering slow and heavy." },
      { part: "chain", view: [-0.35, 0.2, -0.92], zoom: 0.6,
        title: "The chain: power to the road",
        text: "A small sprocket on the engine pulls a chain that turns a big sprocket on the rear wheel. Change the sprocket sizes and you change the gearing: snappier pull-away or calmer cruising. Simple, light and efficient.",
        tip: "Lube the chain often, especially after rain, and keep a little slack in it." },
    ],
  },

  // Ride mode coach: a tip pops up when the bike does the thing it explains (once per ride, a few seconds apart).
  // id = the event in bike3d.js (don't rename); part = an id from parts above, it glows while the tip shows.
  // Listed in priority order: when two events happen together, the first one here wins.
  rideTips: [
    { id: "throttle", part: "intake", title: "Throttle: more air, more fuel",
      text: "Twisting the grip opens valves in the throttle bodies. More air rushes in, the injectors add fuel to match, and every bang gets bigger." },
    { id: "brake", part: "brakes", title: "Hard braking: the front does the work",
      text: "Braking throws your weight forward, so the fork dips and the front tyre grips harder. That's why the front brake does most of the stopping. ABS eases off for a split second if a wheel starts to lock." },
    { id: "lean", part: "wheels", title: "Leaning: push to turn",
      text: "At speed you start a turn by pushing the bar on the side you want to go. That's countersteering. Round-profile tyres let the bike roll onto their edge and still keep a grip patch on the road." },
    { id: "upshift", part: "engine", title: "Upshift: one click up",
      text: "The gearbox is sequential: one click up or down, no skipping. The clutch breaks the drive for a moment, so the revs drop and the next gear takes over. A quickshifter cuts the spark briefly so you can shift without the clutch." },
    { id: "downshift", part: "engine", title: "Downshift: engine braking",
      text: "A lower gear spins the engine faster at the same road speed. Off the throttle, it now holds the bike back. That's engine braking, and it helps the brakes." },
    { id: "revs", part: "engine", title: "High revs: four small cylinders",
      text: "Four small pistons are light, so the engine can spin very fast. Near the red zone the rev limiter cuts in to protect it. Shift up before you hit it." },
    { id: "wheelie", part: "rear-suspension", title: "Wheelie: weight goes back",
      text: "Hard acceleration shifts weight to the back. If the push is strong enough, the front lifts. The swingarm and shock keep the rear tyre pressed down while it happens." },
    { id: "ramair", part: "intake", title: "Ram air: speed helps it breathe",
      text: "The faster you go, the harder air is pushed into the nose intake and on to the airbox. Denser air means a little more power at speed." },
    { id: "cruise", part: "chain", title: "Cruising: the chain drives",
      text: "A small sprocket on the engine pulls the chain, which turns the big sprocket on the rear wheel. Keep it clean, lubed and with a little slack." },
    { id: "stop", part: "cockpit", title: "Stopped: stand and kill switch",
      text: "Most bikes cut the engine if you drop the side stand while in gear, so you can't ride off with it down. The red kill switch on the right bar stops the engine fast in an emergency." },
  ],
  rideCoach: { label: "Pit radio", log: "Lessons learned", locked: "Not found yet. Keep riding." },

  // Workbench: four "how it works" demos. General info only, short plain sentences.
  demos: {
    title: "On the workbench.",
    lede: "Four parts, opened up on the bench. Turn, shift, squeeze and bump them to see how they work.",
    tabsLabel: "Workbench demos",
    engine: {
      tab: "4-stroke engine",
      aria: "Crankshaft. Drag to turn it, or use the arrow keys.",
      hint: "Drag the crank round, or click it and use the arrow keys.",
      angle: "Crank angle",
      step: "Stroke {n} of 4",
      note: "One full cycle takes two turns of the crank: 720°. In an inline-four the cylinders take turns, so one of them is always on its power stroke.",
      labels: { mix: "Air + fuel", exhaust: "Exhaust", spark: "Spark plug", piston: "Piston", crank: "Crank" },
      strokes: [
        { name: "Intake", text: "The piston moves down and the intake valve opens. It pulls a mix of air and fuel into the cylinder, like a syringe." },
        { name: "Compression", text: "Both valves close. The piston moves up and squeezes the mix into a tiny space. A squeezed mix burns with more force." },
        { name: "Power", text: "The spark plug fires. The burning mix expands fast and shoves the piston down. This is the only stroke that makes power." },
        { name: "Exhaust", text: "The exhaust valve opens and the piston moves up, pushing the burnt gas out to the pipe. Then the cycle starts again." },
      ],
    },
    gearbox: {
      tab: "Gearbox",
      control: "Shift lever",
      ratio: "Ratio in this drawing",
      free: "No drive",
      hint: "Motorcycle pattern: 1st is down, neutral sits between 1st and 2nd, then up through 2 to 6.",
      note: "The gearbox is sequential: one click at a time, in order. You can't skip a gear.",
      labels: { engine: "Engine side", wheel: "Wheel side" },
      // teeth: [engine side, wheel side]. Both always add up to 50, so the gears stay meshed.
      gears: [
        { short: "1", name: "1st gear", teeth: [14, 36], text: "A small gear drives a big one. The wheel side turns slowly but with lots of push. Just right for pulling away." },
        { short: "N", name: "Neutral", text: "No gear pair is locked to its shaft. The engine spins, but nothing reaches the rear wheel." },
        { short: "2", name: "2nd gear", teeth: [17, 33], text: "Still plenty of push, but the wheel turns faster for each turn of the engine. Good for slow, tight corners." },
        { short: "3", name: "3rd gear", teeth: [19, 31], text: "The gears are closer in size. A middle ground between pull and speed." },
        { short: "4", name: "4th gear", teeth: [21, 29], text: "Less push, more speed for the same revs. Good for steady riding on open roads." },
        { short: "5", name: "5th gear", teeth: [23, 27], text: "The two gears are nearly the same size, so the wheel side turns almost as fast as the engine side." },
        { short: "6", name: "6th gear", teeth: [24, 26], text: "The tallest gear. Calm revs when cruising, but the least pull. Shift down when you need to speed up quickly." },
      ],
    },
    brakes: {
      tab: "Brakes",
      button: "Hold the brake",
      hint: "Press and hold: finger, mouse, or Space on the keyboard.",
      tag: "Front brake",
      note: "Most bikes also have ABS. If a wheel starts to lock, it eases the pressure for a split second, many times a second.",
      labels: { lever: "Lever", caliper: "Caliper", fork: "Fork", top: "Caliper from above", pads: "Pads", disc: "Disc" },
      states: {
        rolling: { name: "Rolling", text: "The disc spins with the wheel. The pads sit a hair away from it, so nothing drags." },
        braking: { name: "Braking", text: "The lever pushes fluid down the hose. The fluid pushes the caliper pistons, and the pads clamp the disc. Friction turns speed into heat, and the fork dips as the weight moves forward." },
        stopped: { name: "Stopped", text: "The wheel has stopped. The weight settles back and the fork rises a little. The disc stays hot for a while." },
        cooling: { name: "Cooling down", text: "Let go and the pads back off. The disc sheds its heat into the air. That's why discs are big, thin and often drilled." },
      },
    },
    suspension: {
      tab: "Suspension",
      control: "Bump size",
      scale: ["Flat", "Big bump"],
      tag: "Front fork",
      hint: "Slide to make the bump bigger. Watch the rider settle.",
      note: "Spring: holds the bike up and takes the hit. Damper: calms the bounce. You need both.",
      labels: { spring: "Spring", damper: "Damper" },
      // upTo = highest slider value (0 to 100) for this text
      levels: [
        { upTo: 0, name: "Flat road", text: "On smooth tarmac the spring just carries the weight of the bike and rider. Nothing to soak up." },
        { upTo: 35, name: "Small bump", text: "The wheel moves up and the spring squeezes a little to take the hit. The rider barely feels it." },
        { upTo: 70, name: "Medium bump", text: "The spring stores the bump's energy. The damper pushes oil through tiny holes, which slows the rod and turns that energy into heat." },
        { upTo: 100, name: "Big bump", text: "The spring is squeezed hard and the damper works hardest. Without damping the bike would bounce on for several cycles, like a pogo stick." },
      ],
    },
  },

  // Service bay: tools on the pegboard. General care tips only; intervals always come from the owner's manual.
  // id = the drawing in main.js (gauge, chain, oil, torque, fluid, torch); don't rename.
  service: {
    title: "Service bay.",
    lede: "Every tool has its painted spot on the wall. Lift one off to see what it's for.",
    hint: "Pick a tool off the wall.",
    labels: { what: "What", why: "Why", often: "How often", how: "How to" },
    empty: { tag: "Service ticket", name: "Pick a tool", text: "Click or tap a tool on the wall. Its job card shows up here." },
    note: "General tips only. Your owner's manual has the exact values and intervals for your bike.",
    tools: [
      { id: "gauge", name: "Tyre pressure gauge",
        what: "Check the air pressure in both tyres.",
        why: "The right pressure keeps steering light and grip even. Low tyres wear fast and run hot.",
        often: "Before rides, with the tyres cold. Use the pressures your owner's manual gives.",
        how: ["Check before you ride, while the tyres are cold.", "Take off the valve cap and press the gauge on firmly.", "Add or let out air to match the manual, then refit the cap."] },
      { id: "chain", name: "Chain brush and lube",
        what: "Clean and lube the drive chain.",
        why: "A dry, dirty chain wears out itself and the sprockets. A clean, lubed one runs smooth and quiet.",
        often: "As your owner's manual says, and after riding in the rain.",
        how: ["Engine off, gearbox in neutral, bike on a rear stand.", "Turn the wheel by hand and brush the grit off the chain.", "Spray lube on the inside of the chain as it turns. Wipe off the extra."] },
      { id: "oil", name: "Oil can",
        what: "Check the engine oil level.",
        why: "Oil keeps metal parts from rubbing and carries heat away. Too little and the engine wears fast.",
        often: "Check the level often. Change the oil and filter as your owner's manual says.",
        how: ["Bike upright on level ground, engine off for a few minutes.", "Read the level in the sight glass or on the dipstick.", "Top up with the oil type the manual names. Don't overfill."] },
      { id: "torque", name: "Torque wrench",
        what: "Tighten bolts to the right force.",
        why: "Too loose and a part can work free. Too tight and threads strip or parts crack.",
        often: "Every time you refit a part, like an axle, a caliper or the drain plug. The manual lists each value.",
        how: ["Look up the value for that bolt in the manual.", "Set the wrench, then pull slowly and smoothly.", "Stop at the click. Don't give it an extra pull."] },
      { id: "fluid", name: "Brake fluid bottle",
        what: "Check the brake fluid level and colour.",
        why: "Brake fluid slowly soaks up water from the air. Old fluid can boil under hard braking, and the lever goes soft.",
        often: "Check the level often. Change the fluid as your owner's manual says.",
        how: ["Bike upright, look at the reservoir window.", "The level should sit between the two lines. Fresh fluid is clear; old fluid turns dark.", "Low or dark? Have the brakes checked. Wipe spills at once: fluid eats paint."] },
      { id: "torch", name: "Flashlight",
        what: "Look for leaks, wear and damage.",
        why: "A torch shows what daylight hides: oil drips, cracked hoses, thin brake pads, a nail in the tyre.",
        often: "A quick look before rides, and a closer one when you wash the bike.",
        how: ["Shine it under the engine and around the fork seals. Look for drips.", "Look into the caliper at the pads. Thin pads get replaced, as the manual says.", "Check the tread and sidewalls for cuts or anything stuck in them."] },
    ],
  },

  // Pre-ride check. T-CLOCS is a well-known checklist from rider-training courses.
  preRide: {
    title: "Pre-ride check: T-CLOCS",
    intro: "T-CLOCS is a well-known checklist from rider-training courses. Run through it before every ride. It takes two minutes.",
    legend: "T-CLOCS checklist",
    count: "{n} of {total} checked",
    stamp: "Ready to ride",
    items: [
      { name: "Tyres & wheels", hint: "Pressure set, tread and sidewalls fine, nothing stuck in them." },
      { name: "Controls", hint: "Levers, pedals, cables and throttle move freely and spring back." },
      { name: "Lights & electrics", hint: "Headlight, tail and brake light, indicators and horn all work." },
      { name: "Oil & fluids", hint: "Oil and brake fluid at the right level, no drips under the bike." },
      { name: "Chassis", hint: "Chain slack and lube right, suspension moves smoothly, no loose bolts." },
      { name: "Stands", hint: "The side stand springs up and stays up." },
    ],
  },

  // Newsletter form: paste a form service endpoint (e.g. Formspree)
  // here to make it send. Empty = demo mode, nothing is sent.
  formEndpoint: "",
};
