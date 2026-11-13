# Building nameplates

`nameplate.png` is a transparent blank nameplate generated with the built-in
imagegen tool, using `images/home/furniture.png` as the style reference. The
original generated bitmap is preserved. The complete prompt is saved in
`nameplate-prompt.json`.

`nameplate.json` describes the image dimensions, the visible panel rectangle,
and four source insets. The game draws the panel in nine sections: the corners
keep their proportions, the edges stretch in one direction, and the center
fills the available space. The same artwork supports short and multiline names.

Text remains live canvas text. Labels measure the actual rendered font, expand
to the name's width, and wrap longer titles without ellipses or squashed letters.
Long unbroken words and Chinese names wrap at grapheme boundaries. Layout is
cached and refreshed after the artwork and fonts load.

Home, The World, music, and game exhibits use `drawPlaceLabel` in `js/my_life.js`.
Small labels are limited to 216 world units so neighboring collection exhibits
keep their spacing; Home uses 190 and other normal labels 260. A place may set
`labelWidth` to override the limit. Text can add more lines as needed. Nameplates
draw above scene objects and share the corresponding object's click action.
