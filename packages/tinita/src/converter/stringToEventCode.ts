export function stringToEventCode(str: string) {
  if (!str.includes('+')) return { key: str };

  const modifier = str.split('+').map((it) => it.trim());
  const key = modifier.splice(-1)[0].trim();

  let [ctrlKey, shiftKey, altKey, metaKey] = [false, false, false, false];

  const metaCheck = ['⌘', '⊞', 'win', 'meta', 'cmd', 'command'];
  const ctrlCheck = ['ctrl', 'control', '⌃'];
  const altCheck = ['alt', 'option', '⌥'];
  const shiftCheck = ['shift', '⇧'];

  const [metaRegex, ctrlRegex, altRegex, shiftRegex] = [
    new RegExp(metaCheck.join('|'), 'ig'),
    new RegExp(ctrlCheck.join('|'), 'ig'),
    new RegExp(altCheck.join('|'), 'ig'),
    new RegExp(shiftCheck.join('|'), 'ig'),
  ];

  modifier.forEach((it) => {
    [ctrlKey, shiftKey, altKey, metaKey] = [
      ctrlRegex.test(it),
      shiftRegex.test(it),
      altRegex.test(it),
      metaRegex.test(it),
    ];
  });

  return {
    ctrlKey,
    shiftKey,
    altKey,
    metaKey,
    key,
  };
}
