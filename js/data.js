// Стартовые данные ивента. Всё редактируется в интерфейсе (Настройки).
window.NM_DATA = (function () {
  const DIFFICULTIES = [
    { id: 'green',  name: 'Зелёная',    color: '#3fbf5f', hours: 'до 3 ч' },
    { id: 'yellow', name: 'Жёлтая',     color: '#e8c33a', hours: '3–6 ч' },
    { id: 'red',    name: 'Красная',    color: '#e5484d', hours: '6–12 ч' },
    { id: 'purple', name: 'Фиолетовая', color: '#9b5de5', hours: '12–25 ч' },
    { id: 'bordo',  name: 'Бордовая',   color: '#8e1b3a', hours: '25+ ч' },
  ];

  const RINGS = [
    { id: 'outer',  name: 'Внешний регион',  size: 7 },
    { id: 'middle', name: 'Средний регион',  size: 5 },
    { id: 'inner',  name: 'Внутренний регион', size: 3 },
    { id: 'portal', name: 'Портал',          size: 1 },
  ];

  const THEME_ICONS = {
    'Платформер': '🦘', 'Ретро': '👾', 'Казуал': '🧸', 'Головоломка': '🧩', 'Инди': '🎨',
    'Квест': '🗝️', 'Аркада': '🕹️', 'Гонки': '🏎️', 'Файтинг': '🥊', 'Симулятор': '🧽',
    'Хоррор': '👻', 'Шутер': '🔫', 'Экшен': '⚔️', 'Стелс': '🥷', 'Метроидвания': '🗺️',
    'Рогалик': '🎲', 'Выживание': '🔥', 'Приключения': '🧭',
    'Souls-like': '💀', 'RPG': '📜', 'Стратегия': '♟️', 'Открытый мир': '🌍',
    'Любая': '🌀',
  };

  // [тематика, сложность] по часовой стрелке от левого верхнего угла кольца
  const CELLS = {
    outer: [
      ['Платформер', 'green'], ['Ретро', 'green'], ['Казуал', 'green'], ['Головоломка', 'green'],
      ['Инди', 'yellow'], ['Квест', 'green'], ['Аркада', 'green'], ['Гонки', 'green'],
      ['Файтинг', 'yellow'], ['Симулятор', 'green'], ['Платформер', 'yellow'], ['Ретро', 'yellow'],
      ['Головоломка', 'yellow'], ['Квест', 'yellow'], ['Казуал', 'yellow'], ['Инди', 'green'],
      ['Аркада', 'yellow'], ['Гонки', 'yellow'], ['Файтинг', 'green'], ['Симулятор', 'yellow'],
      ['Платформер', 'green'], ['Квест', 'green'], ['Головоломка', 'green'], ['Ретро', 'green'],
    ],
    middle: [
      ['Хоррор', 'yellow'], ['Шутер', 'red'], ['Экшен', 'yellow'], ['Стелс', 'red'],
      ['Метроидвания', 'red'], ['Рогалик', 'yellow'], ['Выживание', 'red'], ['Приключения', 'yellow'],
      ['Хоррор', 'red'], ['Шутер', 'yellow'], ['Экшен', 'red'], ['Стелс', 'yellow'],
      ['Метроидвания', 'yellow'], ['Рогалик', 'red'], ['Выживание', 'yellow'], ['Приключения', 'red'],
    ],
    inner: [
      ['Souls-like', 'purple'], ['RPG', 'bordo'], ['Стратегия', 'purple'], ['Открытый мир', 'bordo'],
      ['Souls-like', 'bordo'], ['RPG', 'purple'], ['Стратегия', 'bordo'], ['Открытый мир', 'purple'],
    ],
    portal: [['Любая', 'bordo']],
  };

  const G = (title, theme, difficulty) => ({ title, theme, difficulty });
  const GAMES = [
    // Внешний регион
    G('Limbo', 'Платформер', 'green'), G('Super Mario Bros.', 'Платформер', 'green'),
    G('Sonic Mania', 'Платформер', 'yellow'), G('Getting Over It', 'Платформер', 'yellow'), G('Only Up!', 'Платформер', 'yellow'),
    G('Celeste', 'Платформер', 'red'), G('Super Meat Boy', 'Платформер', 'red'), G('Cuphead', 'Платформер', 'red'),
    G('Contra', 'Ретро', 'green'), G('Mega Man 2', 'Ретро', 'green'), G('Sonic the Hedgehog', 'Ретро', 'green'), G('Castlevania', 'Ретро', 'green'),
    G('Battletoads', 'Ретро', 'yellow'), G('Ninja Gaiden (NES)', 'Ретро', 'yellow'),
    G('Untitled Goose Game', 'Казуал', 'green'), G('Donut County', 'Казуал', 'green'), G('Pikuniku', 'Казуал', 'green'),
    G('Unpacking', 'Казуал', 'yellow'), G('Lil Gator Game', 'Казуал', 'yellow'),
    G('Portal', 'Головоломка', 'green'), G('Superliminal', 'Головоломка', 'green'), G('The Room', 'Головоломка', 'green'),
    G('Thomas Was Alone', 'Головоломка', 'yellow'), G('Viewfinder', 'Головоломка', 'yellow'), G('Portal 2', 'Головоломка', 'red'),
    G('Journey', 'Инди', 'green'), G('A Short Hike', 'Инди', 'green'), G('Gris', 'Инди', 'yellow'), G('Undertale', 'Инди', 'red'),
    G('What Remains of Edith Finch', 'Квест', 'green'), G('Gone Home', 'Квест', 'green'), G('The Stanley Parable', 'Квест', 'green'),
    G('Firewatch', 'Квест', 'yellow'), G('Oxenfree', 'Квест', 'yellow'), G('Machinarium', 'Квест', 'yellow'),
    G('Metal Slug 3', 'Аркада', 'green'), G("TMNT: Shredder's Revenge", 'Аркада', 'green'), G('Downwell', 'Аркада', 'green'),
    G('Broforce', 'Аркада', 'yellow'),
    G('Hotshot Racing', 'Гонки', 'green'), G('Absolute Drift', 'Гонки', 'green'),
    G('Road Redemption', 'Гонки', 'yellow'), G('Inertial Drift', 'Гонки', 'yellow'),
    G('Tekken 7 (сюжет)', 'Файтинг', 'green'),
    G('Mortal Kombat 11 (сюжет)', 'Файтинг', 'yellow'), G('Mortal Kombat X (сюжет)', 'Файтинг', 'yellow'), G('Injustice 2 (сюжет)', 'Файтинг', 'yellow'),
    G('Goat Simulator', 'Симулятор', 'green'), G('Papers, Please', 'Симулятор', 'yellow'),
    // Средний регион
    G('Outlast', 'Хоррор', 'yellow'), G('Layers of Fear', 'Хоррор', 'yellow'), G('Little Nightmares', 'Хоррор', 'yellow'),
    G('Resident Evil 2 Remake', 'Хоррор', 'red'), G('Resident Evil 7', 'Хоррор', 'red'), G('Amnesia: The Dark Descent', 'Хоррор', 'red'), G('SOMA', 'Хоррор', 'red'), G('Dead Space', 'Хоррор', 'red'),
    G('Titanfall 2', 'Шутер', 'yellow'), G('Quake', 'Шутер', 'yellow'),
    G('DOOM (2016)', 'Шутер', 'red'), G('Wolfenstein: The New Order', 'Шутер', 'red'), G('BioShock', 'Шутер', 'red'), G('Metro 2033', 'Шутер', 'red'),
    G('Hotline Miami', 'Экшен', 'yellow'), G('Katana ZERO', 'Экшен', 'yellow'), G('Metal Gear Rising', 'Экшен', 'yellow'),
    G('Ghostrunner', 'Экшен', 'red'), G('Devil May Cry 5', 'Экшен', 'red'), G('Bayonetta', 'Экшен', 'red'),
    G('Gunpoint', 'Стелс', 'yellow'), G("Monaco: What's Yours Is Mine", 'Стелс', 'yellow'),
    G('Mark of the Ninja', 'Стелс', 'red'), G('Dishonored', 'Стелс', 'red'), G('Aragami', 'Стелс', 'red'), G('Splinter Cell: Chaos Theory', 'Стелс', 'red'),
    G('Guacamelee!', 'Метроидвания', 'yellow'), G('Gato Roboto', 'Метроидвания', 'yellow'),
    G('Ori and the Blind Forest', 'Метроидвания', 'red'), G('Ori and the Will of the Wisps', 'Метроидвания', 'red'), G('Axiom Verge', 'Метроидвания', 'red'),
    G('Vampire Survivors', 'Рогалик', 'yellow'), G('Brotato', 'Рогалик', 'yellow'),
    G('Inscryption', 'Рогалик', 'red'), G('The Binding of Isaac', 'Рогалик', 'red'), G('Risk of Rain 2', 'Рогалик', 'red'), G('Balatro', 'Рогалик', 'red'),
    G('60 Seconds!', 'Выживание', 'yellow'), G('The Flame in the Flood', 'Выживание', 'yellow'),
    G('This War of Mine', 'Выживание', 'red'), G('Frostpunk', 'Выживание', 'red'), G('Stranded Deep', 'Выживание', 'red'),
    G('Stray', 'Приключения', 'yellow'), G('Inside', 'Приключения', 'yellow'), G('Brothers: A Tale of Two Sons', 'Приключения', 'yellow'),
    G('Uncharted: Drake\'s Fortune', 'Приключения', 'red'), G('Tomb Raider (2013)', 'Приключения', 'red'),
    // Внутренний регион и портал
    G('Salt and Sanctuary', 'Souls-like', 'purple'), G('Remnant: From the Ashes', 'Souls-like', 'purple'), G('Blasphemous', 'Souls-like', 'purple'),
    G('Dark Souls', 'Souls-like', 'bordo'), G('Dark Souls III', 'Souls-like', 'bordo'), G('Elden Ring', 'Souls-like', 'bordo'),
    G('Sekiro: Shadows Die Twice', 'Souls-like', 'bordo'), G('Lies of P', 'Souls-like', 'bordo'), G('Hollow Knight', 'Souls-like', 'bordo'),
    G('Disco Elysium', 'RPG', 'purple'), G('Mass Effect', 'RPG', 'purple'), G('Deus Ex', 'RPG', 'purple'), G('Pentiment', 'RPG', 'purple'),
    G('The Witcher 3', 'RPG', 'bordo'), G('Fallout: New Vegas', 'RPG', 'bordo'), G('Star Wars: KOTOR', 'RPG', 'bordo'), G("Baldur's Gate 3", 'RPG', 'bordo'),
    G('StarCraft II: Wings of Liberty', 'Стратегия', 'purple'), G('Warcraft III: Reign of Chaos', 'Стратегия', 'purple'),
    G('Shadow Tactics', 'Стратегия', 'purple'), G('Desperados III', 'Стратегия', 'purple'),
    G('XCOM: Enemy Unknown', 'Стратегия', 'bordo'), G('Darkest Dungeon', 'Стратегия', 'bordo'), G('Heroes of Might and Magic III (кампания)', 'Стратегия', 'bordo'),
    G('Far Cry 3', 'Открытый мир', 'purple'), G('Sleeping Dogs', 'Открытый мир', 'purple'), G('Horizon Zero Dawn', 'Открытый мир', 'purple'),
    G('Red Dead Redemption 2', 'Открытый мир', 'bordo'), G('GTA V', 'Открытый мир', 'bordo'), G('Ghost of Tsushima', 'Открытый мир', 'bordo'), G('Cyberpunk 2077', 'Открытый мир', 'bordo'),
  ];

  const REWARDS = {
    green:  { points: 10, coins: 1 },
    yellow: { points: 20, coins: 2 },
    red:    { points: 35, coins: 3 },
    purple: { points: 55, coins: 5 },
    bordo:  { points: 80, coins: 8 },
  };

  const RULES = {
    lockRings: true,      // кольца открываются постепенно
    unlockMiddle: 2,      // пройдено во внешнем, чтобы войти в средний
    unlockInner: 2,       // пройдено в среднем, чтобы войти во внутренний
    unlockPortal: 1,      // пройдено во внутреннем, чтобы войти в портал
    rerollCost: 3,        // цена переролла игры в бонусной валюте
    dropPenalty: 0,       // штраф очков за дроп
    portalMultiplier: 2,  // множитель награды портала
    currencyName: 'Монеты',
  };

  const PLAYERS = [
    { name: 'Игрок 1', color: '#ff6b6b' },
    { name: 'Игрок 2', color: '#4dabf7' },
    { name: 'Игрок 3', color: '#ffd43b' },
    { name: 'Игрок 4', color: '#69db7c' },
  ];

  return { DIFFICULTIES, RINGS, THEME_ICONS, CELLS, GAMES, REWARDS, RULES, PLAYERS };
})();
