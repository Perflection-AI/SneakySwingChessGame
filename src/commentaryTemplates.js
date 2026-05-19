// Commentary templates for Sneaky Swing broadcast system
// Organized by event type. Each template: { id, text, conditions? }
// Placeholders: {playerName}, {progressYd}, {distanceAfter}, {stroke}, {hole}, {par}

const commentaryTemplates = {
  holeOpen: [
    { id: 'ho_1', text: 'Hole {hole}, Par {par}. Let\'s see what happens.' },
    { id: 'ho_2', text: 'Moving to Hole {hole}, Par {par}. A fresh start.' },
    { id: 'ho_3', text: 'Hole {hole}. Par {par}. Shake it off, reset, go.' },
    { id: 'ho_4', text: 'Par {par} ahead on Hole {hole}. Time to focus.' },
    { id: 'ho_5', text: 'Hole {hole} is a Par {par}. This one could get interesting.' },
    { id: 'ho_6', text: 'A new hole, a new chance to embarrass yourself. Hole {hole}, Par {par}.' },
  ],

  great: [
    { id: 'gr_1', text: '{playerName} flushes it. {progressYd} yards right down the pipe.' },
    { id: 'gr_2', text: 'Beautiful strike from {playerName}. The ball settles {distanceAfter} yards out.' },
    { id: 'gr_3', text: 'That\'s as clean as it gets. {progressYd} yards, no drama.' },
    { id: 'gr_4', text: '{playerName} absolutely nails it. Textbook.' },
    { id: 'gr_5', text: 'Now THAT is a golf shot. {progressYd} yards of pure control.' },
    { id: 'gr_6', text: '{playerName} makes it look easy. {progressYd} yards forward, ball on a string.' },
    { id: 'gr_7', text: 'Picture-perfect from {playerName}. Still {distanceAfter} yards to go, but that was gorgeous.' },
    { id: 'gr_8', text: 'The crowd would be on their feet. {progressYd} yards of pure quality.' },
  ],

  good: [
    { id: 'go_1', text: 'Solid contact. {playerName} moves it {progressYd} yards forward.' },
    { id: 'go_2', text: 'Not flashy, but effective. {progressYd} yards gained.' },
    { id: 'go_3', text: '{playerName} keeps it in play. {distanceAfter} yards left to work with.' },
    { id: 'go_4', text: 'Workmanlike from {playerName}. Gets the job done.' },
    { id: 'go_5', text: 'Steady. {progressYd} yards forward. Nothing wrong with that.' },
    { id: 'go_6', text: '{playerName} advances {progressYd} yards. The boring way to get better.' },
    { id: 'go_7', text: 'A professional, uneventful advance. {distanceAfter} yards remaining.' },
    { id: 'go_8', text: '{playerName} stays on plan. {progressYd} yards closer. On to the next one.' },
  ],

  okay: [
    { id: 'ok_1', text: '{playerName} makes contact, but it\'s not ideal. {progressYd} yards.' },
    { id: 'ok_2', text: 'That\'ll do. Barely. {distanceAfter} yards still to go.' },
    { id: 'ok_3', text: '{playerName} keeps moving forward, but just barely.' },
    { id: 'ok_4', text: 'A survival shot. {progressYd} yards gained, but it wasn\'t pretty.' },
    { id: 'ok_5', text: 'Technically progress. {playerName} won\'t want to watch the replay though.' },
    { id: 'ok_6', text: '{playerName} grinds out {progressYd} yards. Ugly, but counted.' },
  ],

  bad: [
    { id: 'ba_1', text: 'That leaks badly. {distanceAfter} yards left, and it\'s not a friendly spot.' },
    { id: 'ba_2', text: '{playerName} catches it heavy. Only {progressYd} yards. Ouch.' },
    { id: 'ba_3', text: 'Well, that didn\'t work. Still {distanceAfter} yards out.' },
    { id: 'ba_4', text: '{playerName} chunks it. The ball basically gave up halfway.' },
    { id: 'ba_5', text: 'A swing to forget. {distanceAfter} yards remaining and confidence shaken.' },
    { id: 'ba_6', text: '{playerName} fans on that one. The ball sort of... wandered.' },
    { id: 'ba_7', text: 'Yikes. {progressYd} yards is not what the game plan called for.' },
    { id: 'ba_8', text: '{playerName} makes life harder. Still {distanceAfter} yards to go, somehow.' },
  ],

  holed: [
    { id: 'holed_1', text: 'It drops! {playerName} finishes the hole in {stroke}.' },
    { id: 'holed_2', text: 'IN THE HOLE! {playerName} with {stroke} strokes. Beautiful.' },
    { id: 'holed_3', text: 'That\'s in! {playerName} gets it done in {stroke}.' },
    { id: 'holed_4', text: 'Holed! {stroke} strokes for {playerName}. That\'s how you close.' },
    { id: 'holed_5', text: 'The ball finds the bottom of the cup. {playerName}, {stroke} strokes.' },
    { id: 'holed_6', text: 'Gone! {playerName} taps in. {stroke} strokes on Hole {hole}.' },
  ],

  pinseeker: [
    { id: 'ps_1', text: 'Oh, that is TRACKING. Stops just {distanceAfter} yards from the cup.' },
    { id: 'ps_2', text: 'Pin-seeking missile from {playerName}! {distanceAfter} yards out.' },
    { id: 'ps_3', text: 'Right at the flag! The ball settles {distanceAfter} yards away. Almost a highlight reel.' },
    { id: 'ps_4', text: '{playerName} fires a dart. {distanceAfter} yards from glory.' },
  ],

  miracle: [
    { id: 'mi_1', text: 'NO WAY. IT GOES IN! A MIRACLE SHOT FROM {playerName}!' },
    { id: 'mi_2', text: 'ARE YOU KIDDING ME?! {playerName} holes out from nowhere!' },
    { id: 'mi_3', text: 'I DON\'T BELIEVE IT. {playerName} with an absolute miracle!' },
    { id: 'mi_4', text: 'THE IMPOSSIBLE HAPPENS. {playerName} puts it in from distance!' },
  ],

  clutchEnter: [
    { id: 'ce_1', text: 'Inside 20 yards. This is all nerve now.' },
    { id: 'ce_2', text: '{playerName} enters the clutch zone. {distanceAfter} yards to the cup.' },
    { id: 'ce_3', text: 'Clutch range. Power doesn\'t matter here — it\'s all about who holds up.' },
    { id: 'ce_4', text: '{distanceAfter} yards out. Time to find out what {playerName} is made of.' },
  ],

  clutchMiss: [
    { id: 'cm_1', text: 'Lips out! {playerName} reads it wrong. Still {distanceAfter} yards away.' },
    { id: 'cm_2', text: 'Not quite. {playerName} leaves it {distanceAfter} yards short. Clutch is cruel.' },
    { id: 'cm_3', text: 'The ball slides by. {playerName} will have to try again from {distanceAfter} yards.' },
    { id: 'cm_4', text: '{playerName} can\'t convert. {distanceAfter} yards to go. The pressure builds.' },
  ],
}

export default commentaryTemplates
